import { useCallback, useRef, useState } from "react";
import { socket } from "../socket";

const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.relay.metered.ca:80" },
    { urls: "turn:global.relay.metered.ca:80", username: "1607abc84a56877e94776a0d", credential: "vEC/m+3L/7oulvYF" },
    { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "1607abc84a56877e94776a0d", credential: "vEC/m+3L/7oulvYF" },
    { urls: "turn:global.relay.metered.ca:443", username: "1607abc84a56877e94776a0d", credential: "vEC/m+3L/7oulvYF" },
    { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "1607abc84a56877e94776a0d", credential: "vEC/m+3L/7oulvYF" },
];

const DISCONNECT_GRACE_MS = 6000;

export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

export interface IncomingCallData {
    from: string;
    conversationId: string;
    offer: RTCSessionDescriptionInit;
    callType: "audio" | "video";
    callId: string;
}
interface RTCIceCandidateStatsLike extends RTCStats {
    candidateType?: string;
    protocol?: string;
    address?: string;
    ip?: string;
}

interface RTCIceCandidatePairStatsLike extends RTCStats {
    state?: string;
    nominated?: boolean;
    localCandidateId?: string;
    remoteCandidateId?: string;
}

async function logFailureStats(pc: RTCPeerConnection, label: string) {
    try {
        const stats = await pc.getStats();
        const candidates = new Map<string, RTCIceCandidateStatsLike>();
        const pairs: RTCIceCandidatePairStatsLike[] = [];
        stats.forEach((report) => {
            if (report.type === "local-candidate" || report.type === "remote-candidate") {
                candidates.set(report.id, report as RTCIceCandidateStatsLike);
            }
            if (report.type === "candidate-pair") {
                pairs.push(report as RTCIceCandidatePairStatsLike);
            }
        });
        console.groupCollapsed(`[WebRTC] ${label}: candidate-pair dump (${pairs.length} pairs)`);
        if (pairs.length === 0) {
            console.log("No candidate pairs formed at all — candidates likely never arrived from the remote peer.");
        }
        pairs.forEach((p) => {
            const local = p.localCandidateId ? candidates.get(p.localCandidateId) : undefined;
            const remote = p.remoteCandidateId ? candidates.get(p.remoteCandidateId) : undefined;
            console.log(
                `pair state=${p.state} nominated=${!!p.nominated}`,
                "| local:", local?.candidateType, local?.protocol, local?.address ?? local?.ip,
                "| remote:", remote?.candidateType, remote?.protocol, remote?.address ?? remote?.ip
            );
        });
        console.groupEnd();
    } catch (err) {
        console.warn(`[WebRTC] ${label}: failed to read stats`, err);
    }
}

export function useWebRTC() {
    const [callStatus, setCallStatus] = useState<CallStatus>("idle");
    const [callType, setCallType] = useState<"audio" | "video">("video");
    const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
    const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [callError, setCallError] = useState<string | null>(null);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const remoteUserRef = useRef<string | null>(null);
    const conversationIdRef = useRef<string | null>(null);
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const activeCallIdRef = useRef<string | null>(null);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);
    const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMutedRef = useRef(false);
    const isCameraOffRef = useRef(false);

    const acquiringMediaRef = useRef(false);

    const callInProgressRef = useRef(false);

    const startRingtone = useCallback(() => {
        if (!ringtoneRef.current) {
            ringtoneRef.current = new Audio("/ringtone.mp3");
            ringtoneRef.current.loop = true;
        }
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current.play().catch(() => { });
    }, []);

    const stopRingtone = useCallback(() => {
        ringtoneRef.current?.pause();
        if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
    }, []);

    const clearDisconnectTimer = useCallback(() => {
        if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
        }
    }, []);

    const cleanup = useCallback(() => {
        stopRingtone();
        clearDisconnectTimer();
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        remoteStreamRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        setRemoteUserId(null);
        setIncomingCall(null);
        setCallStatus("idle");
        setIsMuted(false);
        setIsCameraOff(false);
        isMutedRef.current = false;
        isCameraOffRef.current = false;
        remoteUserRef.current = null;
        conversationIdRef.current = null;
        pendingCandidatesRef.current = [];
        activeCallIdRef.current = null;
        callInProgressRef.current = false;
    }, [stopRingtone, clearDisconnectTimer]);

    const createPeerConnection = useCallback((remoteId: string, callId: string) => {

        if (pcRef.current) {
            const stalePc = pcRef.current;
            stalePc.onconnectionstatechange = null;
            stalePc.oniceconnectionstatechange = null;
            stalePc.ontrack = null;
            stalePc.onicecandidate = null;
            stalePc.close();
        }
        pcRef.current = null;
        pendingCandidatesRef.current = [];
        remoteStreamRef.current = null;
        clearDisconnectTimer();

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        const isCurrent = () => pcRef.current === pc;

        pc.onicecandidate = (event) => {
            if (!isCurrent()) return;
            if (event.candidate) {
                console.log("ICE candidate:", event.candidate.type, event.candidate.protocol, event.candidate.address);
                socket.emit("iceCandidate", { to: remoteId, candidate: event.candidate.toJSON(), callId });
            } else {
                console.log("ICE gathering complete");
            }
        };

        pc.ontrack = (event) => {
            if (!isCurrent()) return;
            console.log("Remote track received:", event.track.kind);
            if (!remoteStreamRef.current) {
                remoteStreamRef.current = new MediaStream();
                setRemoteStream(remoteStreamRef.current);
            }
            remoteStreamRef.current.addTrack(event.track);
        };

        pc.oniceconnectionstatechange = () => {
            if (!isCurrent()) return;
            console.log("ICE connection state:", pc.iceConnectionState);

            if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
                clearDisconnectTimer();
                stopRingtone();
                setCallStatus((prev) => (prev === "ended" ? prev : "connected"));
            } else if (pc.iceConnectionState === "failed") {
                logFailureStats(pc, "iceConnectionState=failed");
                setCallError("Call failed to connect. This can happen on restrictive networks — try again, or check your connection.");
                cleanup();
            }
        };

        pc.onconnectionstatechange = () => {
            if (!isCurrent()) return;
            console.log("Peer connection state:", pc.connectionState);

            if (pc.connectionState === "connected") {
                clearDisconnectTimer();
                stopRingtone();
                setCallStatus("connected");
            } else if (pc.connectionState === "disconnected") {

                clearDisconnectTimer();
                disconnectTimerRef.current = setTimeout(() => {
                    if (!isCurrent()) return;
                    if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                        console.warn("Connection did not recover from 'disconnected' within grace period — ending call.");
                        setCallError("Connection lost.");
                        cleanup();
                    }
                }, DISCONNECT_GRACE_MS);
            } else if (pc.connectionState === "failed") {
                clearDisconnectTimer();
                console.error("Peer connection failed");
                logFailureStats(pc, "connectionState=failed");
                setCallError("Connection failed. Check the network or TURN server.");
                cleanup();
            } else if (pc.connectionState === "closed") {
                clearDisconnectTimer();
                stopRingtone();
                setCallStatus((prev) => (prev === "idle" ? prev : "ended"));
            }
        };

        pcRef.current = pc;
        return pc;
    }, [cleanup, stopRingtone, clearDisconnectTimer]);

    const acquireMedia = useCallback((type: "audio" | "video") => {
        return navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
    }, []);

    const getLocalMedia = useCallback(async (type: "audio" | "video") => {

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
            setLocalStream(null);
        }

        if (acquiringMediaRef.current) {
            throw new Error("Already connecting to the camera/microphone — please wait a moment.");
        }
        acquiringMediaRef.current = true;

        try {
            let stream: MediaStream;
            try {
                stream = await acquireMedia(type);
            } catch (error) {
                if (error instanceof DOMException && error.name === "NotReadableError") {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    stream = await acquireMedia(type);
                } else {
                    throw error;
                }
            }
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (error) {
            if (error instanceof DOMException) {
                if (error.name === "NotReadableError") {
                    throw new Error("Camera or microphone is already in use by another app or browser tab. Close anything else using it and try again.");
                }
                if (error.name === "NotAllowedError") throw new Error("Camera/microphone permission was denied.");
                if (error.name === "NotFoundError") throw new Error("No camera or microphone found.");
            }
            throw error;
        } finally {
            acquiringMediaRef.current = false;
        }
    }, [acquireMedia]);

    const startCall = useCallback(async (targetUserId: string, conversationId: string, type: "audio" | "video") => {
        if (callInProgressRef.current) return;
        callInProgressRef.current = true;
        try {
            setCallError(null);
            setCallType(type);
            setCallStatus("calling");
            remoteUserRef.current = targetUserId;
            conversationIdRef.current = conversationId;
            setRemoteUserId(targetUserId);

            const callId = crypto.randomUUID();
            activeCallIdRef.current = callId;
            startRingtone();

            const stream = await getLocalMedia(type);
            const pc = createPeerConnection(targetUserId, callId);
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit("callUser", { to: targetUserId, conversationId, offer, callType: type, callId });
        } catch (error) {
            console.error("Failed to start call:", error);
            setCallError(error instanceof Error ? error.message : "Failed to start call");
            cleanup();
        }
    }, [getLocalMedia, createPeerConnection, cleanup, startRingtone]);

    const acceptCall = useCallback(async () => {
        if (!incomingCall) return;
        if (callInProgressRef.current) return;
        callInProgressRef.current = true;

        try {
            stopRingtone();
            const { from, offer, callType: incomingType, conversationId, callId } = incomingCall;
            activeCallIdRef.current = callId;
            setCallError(null);
            setCallType(incomingType);
            remoteUserRef.current = from;
            conversationIdRef.current = conversationId;
            setRemoteUserId(from);
            setCallStatus("calling"); // shows the VideoCall shell immediately while ICE negotiates

            const stream = await getLocalMedia(incomingType);
            const pc = createPeerConnection(from, callId);
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            for (const candidate of pendingCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answerCall", { to: from, conversationId, answer, callId });
            setIncomingCall(null);
        } catch (error) {
            console.error("Failed to accept call:", error);
            setCallError(error instanceof Error ? error.message : "Failed to accept call");
            cleanup();
        }
    }, [incomingCall, getLocalMedia, createPeerConnection, cleanup, stopRingtone]);

    const rejectCall = useCallback(() => {
        if (!incomingCall) return;
        stopRingtone();
        socket.emit("rejectCall", {
            to: incomingCall.from,
            conversationId: incomingCall.conversationId,
            callId: incomingCall.callId,
        });
        setIncomingCall(null);
        setCallStatus("idle");
        activeCallIdRef.current = null;
    }, [incomingCall, stopRingtone]);

    const endCall = useCallback(() => {
        if (remoteUserRef.current && conversationIdRef.current && activeCallIdRef.current) {
            socket.emit("endCall", {
                to: remoteUserRef.current,
                conversationId: conversationIdRef.current,
                callId: activeCallIdRef.current,
            });
        }
        cleanup();
    }, [cleanup]);

    const toggleMute = useCallback(() => {
        if (!localStreamRef.current) return;
        const next = !isMutedRef.current;
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
        isMutedRef.current = next;
        setIsMuted(next);
    }, []);

    const toggleCamera = useCallback(() => {
        if (!localStreamRef.current) return;
        const next = !isCameraOffRef.current;
        localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !next));
        isCameraOffRef.current = next;
        setIsCameraOff(next);
    }, []);

    const registerListeners = useCallback(() => {
        const handleIncomingCall = (data: IncomingCallData) => {
            if (pcRef.current) {
                socket.emit("rejectCall", { to: data.from, conversationId: data.conversationId, callId: data.callId });
                return;
            }
            setIncomingCall(data);
            setCallStatus("ringing");
            startRingtone();
        };

        const handleCallAnswered = async (data: { from: string; conversationId: string; answer: RTCSessionDescriptionInit; callId: string }) => {
            const pc = pcRef.current;
            if (!pc || pc.signalingState === "closed" || data.callId !== activeCallIdRef.current) return;
            stopRingtone();
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                for (const candidate of pendingCandidatesRef.current) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
                pendingCandidatesRef.current = [];
            } catch (error) {
                console.error("Failed to process answer:", error);
            }
        };

        const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit; callId: string }) => {
            if (activeCallIdRef.current && data.callId !== activeCallIdRef.current) return;
            const pc = pcRef.current;
            if (!pc || pc.signalingState === "closed") return;
            if (!pc.remoteDescription) {
                pendingCandidatesRef.current.push(data.candidate);
                return;
            }
            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
                console.error("Failed to add ICE candidate:", error);
            }
        };

        const handleCallRejected = () => {
            setCallError("Call was declined.");
            cleanup();
        };

        const handleCallEnded = () => {
            cleanup();
        };

        const handleCallUserOffline = () => {
            setCallError("That user is offline.");
            cleanup();
        };

        socket.on("incomingCall", handleIncomingCall);
        socket.on("callAnswered", handleCallAnswered);
        socket.on("iceCandidateReceived", handleIceCandidate);
        socket.on("callRejected", handleCallRejected);
        socket.on("callEnded", handleCallEnded);
        socket.on("callUserOffline", handleCallUserOffline);

        return () => {
            socket.off("incomingCall", handleIncomingCall);
            socket.off("callAnswered", handleCallAnswered);
            socket.off("iceCandidateReceived", handleIceCandidate);
            socket.off("callRejected", handleCallRejected);
            socket.off("callEnded", handleCallEnded);
            socket.off("callUserOffline", handleCallUserOffline);
        };
    }, [cleanup, startRingtone, stopRingtone]);

    return {
        callStatus, callType, incomingCall, remoteUserId,
        localStream, remoteStream, isMuted, isCameraOff, callError,
        startCall, acceptCall, rejectCall, endCall,
        toggleMute, toggleCamera, registerListeners,
    };
}