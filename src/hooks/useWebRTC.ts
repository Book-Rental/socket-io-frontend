import { useCallback, useRef, useState } from "react";
import { socket } from "../socket";

const TURN_USER = import.meta.env.VITE_TURN_USER;
const TURN_PASS = import.meta.env.VITE_TURN_PASS;
const HAS_TURN = Boolean(TURN_USER && TURN_PASS);
console.log("[WebRTC] TURN configured:", HAS_TURN);

const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.relay.metered.ca:80" },
    ...(HAS_TURN
        ? [
            { urls: "turn:global.relay.metered.ca:80", username: TURN_USER, credential: TURN_PASS },
            { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: TURN_USER, credential: TURN_PASS },
            { urls: "turn:global.relay.metered.ca:443", username: TURN_USER, credential: TURN_PASS },
            { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: TURN_USER, credential: TURN_PASS },
        ]
        : []),
];

// Relay-only is the most reliable option, but only when TURN is actually configured.
const FORCE_RELAY = HAS_TURN;

const DISCONNECT_GRACE_MS = 15000;

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
            if (report.type === "candidate-pair") pairs.push(report as RTCIceCandidatePairStatsLike);
        });
        console.groupCollapsed(`[WebRTC] ${label}: candidate-pair dump (${pairs.length} pairs)`);
        if (pairs.length === 0) console.log("No candidate pairs formed — remote candidates likely never arrived.");
        pairs.forEach((p) => {
            const local = p.localCandidateId ? candidates.get(p.localCandidateId) : undefined;
            const remote = p.remoteCandidateId ? candidates.get(p.remoteCandidateId) : undefined;
            console.log(
                `pair state=${p.state} nominated=${!!p.nominated}`,
                "| local:", local?.candidateType, local?.protocol,
                "| remote:", remote?.candidateType, remote?.protocol
            );
        });
        console.groupEnd();
    } catch (err) {
        console.warn(`[WebRTC] ${label}: failed to read stats`, err);
    }
}

function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 4000): Promise<void> {
    return new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        const finish = () => {
            pc.removeEventListener("icegatheringstatechange", onChange);
            clearTimeout(timer);
            resolve();
        };
        const onChange = () => { if (pc.iceGatheringState === "complete") finish(); };
        const timer = setTimeout(finish, timeoutMs);
        pc.addEventListener("icegatheringstatechange", onChange);
    });
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
    // Candidates queued per callId (they can arrive while the callee is still ringing).
    const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const activeCallIdRef = useRef<string | null>(null);
    const incomingCallRef = useRef<IncomingCallData | null>(null);
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

    const cleanup = useCallback((reason = "unknown") => {
        console.warn("[WebRTC] cleanup:", reason);
        stopRingtone();
        clearDisconnectTimer();
        const pc = pcRef.current;
        if (pc) {
            // Detach handlers first so close() can't trigger a stale "closed" -> "ended" update.
            pc.onconnectionstatechange = null;
            pc.oniceconnectionstatechange = null;
            pc.ontrack = null;
            pc.onicecandidate = null;
            pc.close();
        }
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
        pendingCandidatesRef.current.clear();
        activeCallIdRef.current = null;
        incomingCallRef.current = null;
        callInProgressRef.current = false;
    }, [stopRingtone, clearDisconnectTimer]);

    const flushPendingCandidates = useCallback(async (pc: RTCPeerConnection, callId: string) => {
        const queued = pendingCandidatesRef.current.get(callId) ?? [];
        pendingCandidatesRef.current.delete(callId);
        for (const candidate of queued) {
            try {
                await pc.addIceCandidate(candidate);
            } catch (error) {
                console.warn("Failed to add queued ICE candidate:", error);
            }
        }
    }, []);

    const createPeerConnection = useCallback((remoteId: string, callId: string) => {
        if (pcRef.current) {
            const stale = pcRef.current;
            stale.onconnectionstatechange = null;
            stale.oniceconnectionstatechange = null;
            stale.ontrack = null;
            stale.onicecandidate = null;
            stale.close();
        }
        pcRef.current = null;
        remoteStreamRef.current = null;
        clearDisconnectTimer();
        // The pending queue is NOT cleared here: on the callee it holds the caller's
        // candidates that arrived while ringing.

        const pc = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
            ...(FORCE_RELAY ? { iceTransportPolicy: "relay" as RTCIceTransportPolicy } : {}),
        });
        const isCurrent = () => pcRef.current === pc;
        pc.onicecandidateerror = (e: RTCPeerConnectionIceErrorEvent) =>
            console.warn("ICE candidate error:", e.errorCode, e.errorText, e.url);

        pc.onicecandidate = (event) => {
            if (!isCurrent()) return;
            if (event.candidate) {
                console.log("LOCAL candidate:", event.candidate.type, event.candidate.protocol);
                socket.emit("iceCandidate", { to: remoteId, candidate: event.candidate.toJSON(), callId });
            } else {
                console.log("LOCAL gathering complete");
            }
        };

        pc.ontrack = (event) => {
            if (!isCurrent()) return;
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
                setCallStatus("connected");
            } else if (pc.iceConnectionState === "failed") {
                logFailureStats(pc, "iceConnectionState=failed");
                setCallError("Call failed to connect. This can happen on restrictive networks — try again.");
                cleanup("ice-failed");
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
                        setCallError("Connection lost.");
                        cleanup("disconnect-timeout");
                    }
                }, DISCONNECT_GRACE_MS);
            } else if (pc.connectionState === "failed") {
                clearDisconnectTimer();
                logFailureStats(pc, "connectionState=failed");
                setCallError("Connection failed. Check the network or TURN server.");
                cleanup("conn-failed");
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
                    await new Promise((r) => setTimeout(r, 500));
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
                if (error.name === "NotReadableError") throw new Error("Camera or microphone is already in use by another app or tab.");
                if (error.name === "NotAllowedError") throw new Error("Camera/microphone permission was denied.");
                if (error.name === "NotFoundError") throw new Error("No camera or microphone found.");
            }
            throw error;
        } finally {
            acquiringMediaRef.current = false;
        }
    }, [acquireMedia]);

    const startCall = useCallback(async (targetUserId: string, conversationId: string, type: "audio" | "video") => {
        if (callInProgressRef.current || incomingCallRef.current) return;
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

            await waitForIceGathering(pc);
            if (pcRef.current !== pc) return; // call was cancelled meanwhile
            const local = pc.localDescription!;
            socket.emit("callUser", {
                to: targetUserId,
                conversationId,
                offer: { type: local.type, sdp: local.sdp },
                callType: type,
                callId,
            });
        } catch (error) {
            console.error("Failed to start call:", error);
            setCallError(error instanceof Error ? error.message : "Failed to start call");
            cleanup("start-error");
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
            setCallStatus("calling");
            incomingCallRef.current = null;
            setIncomingCall(null);

            const stream = await getLocalMedia(incomingType);
            const pc = createPeerConnection(from, callId);
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            await flushPendingCandidates(pc, callId);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await waitForIceGathering(pc);
            if (pcRef.current !== pc) return;
            const local = pc.localDescription!;
            socket.emit("answerCall", {
                to: from,
                conversationId,
                answer: { type: local.type, sdp: local.sdp },
                callId,
            });
        } catch (error) {
            console.error("Failed to accept call:", error);
            setCallError(error instanceof Error ? error.message : "Failed to accept call");
            cleanup("accept-error");
        }
    }, [incomingCall, getLocalMedia, createPeerConnection, cleanup, stopRingtone, flushPendingCandidates]);

    const rejectCall = useCallback(() => {
        if (!incomingCall) return;
        stopRingtone();
        socket.emit("rejectCall", {
            to: incomingCall.from,
            conversationId: incomingCall.conversationId,
            callId: incomingCall.callId,
        });
        pendingCandidatesRef.current.delete(incomingCall.callId);
        incomingCallRef.current = null;
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
        setCallError(null); // also serves as "Dismiss" for the error card
        cleanup("local-end");
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
            // Same call delivered twice: ignore it
            if (data.callId === incomingCallRef.current?.callId || data.callId === activeCallIdRef.current) return;

            // Busy: in a call, dialing, or already ringing for another call
            if (pcRef.current || callInProgressRef.current || activeCallIdRef.current || incomingCallRef.current) {
                socket.emit("rejectCall", { to: data.from, conversationId: data.conversationId, callId: data.callId });
                return;
            }

            // Drop queued candidates that belong to other (stale) calls; keep this call's early ones
            for (const key of Array.from(pendingCandidatesRef.current.keys())) {
                if (key !== data.callId) pendingCandidatesRef.current.delete(key);
            }

            setCallError(null);
            incomingCallRef.current = data;
            setIncomingCall(data);
            setCallType(data.callType);
            setRemoteUserId(data.from);
            setCallStatus("ringing");
            startRingtone();
        };

        const handleCallAnswered = async (data: { from: string; conversationId: string; answer: RTCSessionDescriptionInit; callId: string }) => {
            const pc = pcRef.current;
            if (!pc || pc.signalingState === "closed" || data.callId !== activeCallIdRef.current) return;
            stopRingtone();
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                await flushPendingCandidates(pc, data.callId);
            } catch (error) {
                console.error("Failed to process answer:", error);
            }
        };

        const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit; callId: string }) => {
            // Ignore candidates for a different call than the one we're in
            if (activeCallIdRef.current && data.callId !== activeCallIdRef.current) return;
            console.log("REMOTE candidate received, pc?", !!pcRef.current);

            const pc = pcRef.current;
            if (!pc || pc.signalingState === "closed" || !pc.remoteDescription) {
                const list = pendingCandidatesRef.current.get(data.callId) ?? [];
                list.push(data.candidate);
                pendingCandidatesRef.current.set(data.callId, list);
                return;
            }
            try {
                await pc.addIceCandidate(data.candidate);
            } catch (error) {
                console.warn("Failed to add ICE candidate:", error);
            }
        };

        const handleCallRejected = (data?: { callId?: string }) => {
            if (data?.callId && activeCallIdRef.current && data.callId !== activeCallIdRef.current) return;
            setCallError("Call was declined.");
            cleanup("remote-rejected");
        };

        const handleCallEnded = (data?: { callId?: string }) => {
            const current = activeCallIdRef.current ?? incomingCallRef.current?.callId;
            if (data?.callId && current && data.callId !== current) return;
            cleanup("remote-ended");
        };

        const handleCallUserOffline = () => {
            setCallError("That user is offline.");
            cleanup("offline");
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
    }, [cleanup, startRingtone, stopRingtone, flushPendingCandidates]);

    return {
        callStatus, callType, incomingCall, remoteUserId,
        localStream, remoteStream, isMuted, isCameraOff, callError,
        startCall, acceptCall, rejectCall, endCall,
        toggleMute, toggleCamera, registerListeners,
    };
}