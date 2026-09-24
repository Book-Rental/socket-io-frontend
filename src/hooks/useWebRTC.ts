import { useCallback, useRef, useState } from "react";
import { socket } from "../socket";

const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.relay.metered.ca:80" },
    {
        urls: "turn:global.relay.metered.ca:80",
        username: "1607abc84a56877e94776a0d",
        credential: "vEC/m+3L/7oulvYF",
    },
    {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "1607abc84a56877e94776a0d",
        credential: "vEC/m+3L/7oulvYF",
    },
    {
        urls: "turn:global.relay.metered.ca:443",
        username: "1607abc84a56877e94776a0d",
        credential: "vEC/m+3L/7oulvYF",
    },
    {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "1607abc84a56877e94776a0d",
        credential: "vEC/m+3L/7oulvYF",
    },
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
    const cleanup = useCallback(() => {
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        remoteStreamRef.current = null;
        setRemoteStream(null);
        remoteUserRef.current = null;
        conversationIdRef.current = null;
        pendingCandidatesRef.current = [];
        setRemoteUserId(null);
        setIncomingCall(null);
        setCallStatus("idle");
        setIsMuted(false);
        setIsCameraOff(false);
    }, []);

    const createPeerConnection = useCallback((remoteUserIdArg: string, callId: string) => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        pendingCandidatesRef.current = [];
        remoteStreamRef.current = null;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("iceCandidate", {
                    to: remoteUserIdArg,
                    candidate: event.candidate.toJSON(),
                    callId,   // NEW
                });
            }
        };

        pc.ontrack = (event) => {
            console.log("Remote track received:", event.track.kind);
            if (!remoteStreamRef.current) {
                remoteStreamRef.current = new MediaStream();
                setRemoteStream(remoteStreamRef.current);
            }
            remoteStreamRef.current.addTrack(event.track);
        };

        pc.oniceconnectionstatechange = () => {
            console.log("ICE connection state:", pc.iceConnectionState);
            if (pc.iceConnectionState === "failed") {
                setCallError("Connection failed — a TURN server is likely needed for this network.");
                cleanup();
            }
        };

        pc.onconnectionstatechange = () => {
            console.log("Peer connection state:", pc.connectionState);
            if (pc.connectionState === "connected") {
                setCallStatus("connected");   // Priority 5: ONLY place this is set
            }
            if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
                setCallStatus((prev) => (prev === "idle" ? prev : "ended"));
            }
        };

        pcRef.current = pc;
        return pc;
    }, [cleanup]);
    const getLocalMedia = useCallback(async (type: "audio" | "video") => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === "video",
            });
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (error) {
            if (error instanceof DOMException) {
                if (error.name === "NotReadableError") {
                    throw new Error("Camera or microphone is already in use by another app or tab.");
                }
                if (error.name === "NotAllowedError") {
                    throw new Error("Camera/microphone permission was denied.");
                }
                if (error.name === "NotFoundError") {
                    throw new Error("No camera or microphone found on this device.");
                }
            }
            throw error;
        }
    }, []);

    const startCall = useCallback(
        async (targetUserId: string, conversationId: string, type: "audio" | "video") => {
            try {
                setCallError(null);
                setCallType(type);
                setCallStatus("calling");
                remoteUserRef.current = targetUserId;
                conversationIdRef.current = conversationId;
                setRemoteUserId(targetUserId);

                const callId = crypto.randomUUID();
                activeCallIdRef.current = callId;

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
        },
        [getLocalMedia, createPeerConnection, cleanup]
    );

    const acceptCall = useCallback(async () => {
        if (!incomingCall) return;

        try {
            setCallError(null);
            const { from, offer, callType: incomingType, conversationId, callId } = incomingCall;
            activeCallIdRef.current = callId;
            setCallType(incomingType);
            remoteUserRef.current = from;
            conversationIdRef.current = conversationId;
            setRemoteUserId(from);

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
            // connected is now set ONLY by onconnectionstatechange — see Priority 5
        } catch (error) {
            console.error("Failed to accept call:", error);
            setCallError(error instanceof Error ? error.message : "Failed to accept call");
            cleanup();
        }
    }, [incomingCall, getLocalMedia, createPeerConnection, cleanup]);

    const rejectCall = useCallback(() => {
        if (!incomingCall) return;
        socket.emit("rejectCall", { to: incomingCall.from, conversationId: incomingCall.conversationId });
        setIncomingCall(null);
        setCallStatus("idle");
    }, [incomingCall]);

    const endCall = useCallback(() => {
        if (remoteUserRef.current && conversationIdRef.current) {
            socket.emit("endCall", { to: remoteUserRef.current, conversationId: conversationIdRef.current });
        }
        cleanup();
    }, [cleanup]);

    const toggleMute = useCallback(() => {
        if (!localStreamRef.current) return;
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = isMuted));
        setIsMuted((prev) => !prev);
    }, [isMuted]);

    const toggleCamera = useCallback(() => {
        if (!localStreamRef.current) return;
        localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = isCameraOff));
        setIsCameraOff((prev) => !prev);
    }, [isCameraOff]);

    const registerListeners = useCallback(() => {
        const handleIncomingCall = (data: IncomingCallData) => {
            if (pcRef.current) {
                socket.emit("rejectCall", { to: data.from, conversationId: data.conversationId });
                return;
            }
            setIncomingCall(data);
            setCallStatus("ringing");
        };

        const handleCallAnswered = async (data: { from: string; conversationId: string; answer: RTCSessionDescriptionInit; callId: string }) => {
            const pc = pcRef.current;
            if (!pc || pc.signalingState === "closed") return;
            if (data.callId !== activeCallIdRef.current) return;   // NEW: ignore stale/mismatched call

            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            for (const candidate of pendingCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];
        };

        const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit; callId: string }) => {
            if (activeCallIdRef.current && data.callId !== activeCallIdRef.current) return; // NEW: ignore old call's candidates

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
        const handleCallRejected = () => cleanup();
        const handleCallEnded = () => cleanup();
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
    }, [cleanup]);

    return {
        callStatus, callType, incomingCall, remoteUserId,
        localStream, remoteStream, isMuted, isCameraOff, callError,
        startCall, acceptCall, rejectCall, endCall,
        toggleMute, toggleCamera, registerListeners,
    };
}