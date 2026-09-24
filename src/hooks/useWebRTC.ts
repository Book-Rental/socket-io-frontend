import { useCallback, useRef, useState } from "react";
import { socket } from "../socket";

const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.relay.metered.ca:80" },
    { urls: "turn:global.relay.metered.ca:80", username: "1607abc84a56877e94776a0d", credential: "vEC/m+3L/7oulvYF" },
    { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "1607abc84a56877e94776a0d", credential: "vEC/m+3L/7oulvYF" },
    { urls: "turn:global.relay.metered.ca:443", username: "1607abc84a56877e94776a0d", credential: "vEC/m+3L/7oulvYF" },
    { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "1607abc84a56877e94776a0d", credential: "vEC/m+3L/7oulvYF" },
];

export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

export interface IncomingCallData {
    from: string;
    conversationId: string;
    offer: RTCSessionDescriptionInit;
    callType: "audio" | "video";
    callId: string;
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

    const cleanup = useCallback(() => {
        stopRingtone();
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
        remoteUserRef.current = null;
        conversationIdRef.current = null;
        pendingCandidatesRef.current = [];
        activeCallIdRef.current = null;
    }, [stopRingtone]);

    const createPeerConnection = useCallback((remoteId: string, callId: string) => {
        // Close any stale connection BEFORE creating the new one, and make
        // sure its old event handlers can never affect state going forward.
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

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        // Guard: only apply state updates if this pc is STILL the active one
        // by the time these handlers fire (prevents stale-handler races).
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
            if (pc.iceConnectionState === "failed") {
                setCallError("Call failed to connect. This can happen on restrictive networks — try again, or check your connection.");
                cleanup();
            }
        };

        pc.onconnectionstatechange = () => {
            if (!isCurrent()) return;
            console.log("Peer connection state:", pc.connectionState);
            if (pc.connectionState === "connected") {
                stopRingtone();
                setCallStatus("connected");
            } else if (pc.connectionState === "failed") {
                setCallError("Call failed to connect.");
                cleanup();
            } else if (["disconnected", "closed"].includes(pc.connectionState)) {
                stopRingtone();
                setCallStatus((prev) => (prev === "idle" ? prev : "ended"));
            }
        };

        pcRef.current = pc;
        return pc;
    }, [cleanup, stopRingtone]);

    const getLocalMedia = useCallback(async (type: "audio" | "video") => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (error) {
            if (error instanceof DOMException) {
                if (error.name === "NotReadableError") throw new Error("Camera or microphone is already in use.");
                if (error.name === "NotAllowedError") throw new Error("Camera/microphone permission was denied.");
                if (error.name === "NotFoundError") throw new Error("No camera or microphone found.");
            }
            throw error;
        }
    }, []);

    const startCall = useCallback(async (targetUserId: string, conversationId: string, type: "audio" | "video") => {
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
        setIsMuted((prev) => {
            localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = prev));
            return !prev;
        });
    }, []);

    const toggleCamera = useCallback(() => {
        if (!localStreamRef.current) return;
        setIsCameraOff((prev) => {
            localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = prev));
            return !prev;
        });
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