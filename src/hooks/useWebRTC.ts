import { useCallback, useRef, useState } from "react";
import { socket } from "../socket";

const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
];

export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

export interface IncomingCallData {
    from: string;
    conversationId: string;
    offer: RTCSessionDescriptionInit;
    callType: "audio" | "video";
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

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const remoteUserRef = useRef<string | null>(null);
    const conversationIdRef = useRef<string | null>(null);
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const localStreamRef = useRef<MediaStream | null>(null);

    const cleanup = useCallback(() => {
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
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

    const createPeerConnection = useCallback((remoteUserIdArg: string) => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("iceCandidate", {
                    to: remoteUserIdArg,
                    candidate: event.candidate.toJSON(),
                });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") {
                setCallStatus("connected");
            }
            if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
                setCallStatus((prev) => (prev === "idle" ? prev : "ended"));
            }
        };

        pcRef.current = pc;
        return pc;
    }, []);

    const getLocalMedia = useCallback(async (type: "audio" | "video") => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: type === "video",
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
    }, []);

    /** Caller side */
    const startCall = useCallback(
        async (targetUserId: string, conversationId: string, type: "audio" | "video") => {
            try {
                setCallType(type);
                setCallStatus("calling");
                remoteUserRef.current = targetUserId;
                conversationIdRef.current = conversationId;
                setRemoteUserId(targetUserId);

                const stream = await getLocalMedia(type);
                const pc = createPeerConnection(targetUserId);
                stream.getTracks().forEach((track) => pc.addTrack(track, stream));

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                socket.emit("callUser", { to: targetUserId, conversationId, offer, callType: type });
            } catch (error) {
                console.error("Failed to start call:", error);
                cleanup();
            }
        },
        [getLocalMedia, createPeerConnection, cleanup]
    );

    /** Callee side */
    const acceptCall = useCallback(async () => {
        if (!incomingCall) return;

        try {
            const { from, offer, callType: incomingType, conversationId } = incomingCall;
            setCallType(incomingType);
            remoteUserRef.current = from;
            conversationIdRef.current = conversationId;
            setRemoteUserId(from);

            const stream = await getLocalMedia(incomingType);
            const pc = createPeerConnection(from);
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            for (const candidate of pendingCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("answerCall", { to: from, conversationId, answer });

            setIncomingCall(null);
            setCallStatus("connected");
        } catch (error) {
            console.error("Failed to accept call:", error);
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

    /* ---------- global socket listeners — registered once, app-wide ---------- */
    const registerListeners = useCallback(() => {
        const handleIncomingCall = (data: IncomingCallData) => {
            // Global: ring regardless of which screen/conversation is open.
            // If already on a call, auto-reject the new one (one call at a time).
            if (pcRef.current) {
                socket.emit("rejectCall", { to: data.from, conversationId: data.conversationId });
                return;
            }
            setIncomingCall(data);
            setCallStatus("ringing");
        };

        const handleCallAnswered = async (data: { from: string; conversationId: string; answer: RTCSessionDescriptionInit }) => {
            const pc = pcRef.current;
            if (!pc) return;
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            for (const candidate of pendingCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];
        };

        const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit }) => {
            const pc = pcRef.current;
            if (!pc) return;
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
        const handleCallUserOffline = () => cleanup();

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
        localStream, remoteStream, isMuted, isCameraOff,
        startCall, acceptCall, rejectCall, endCall,
        toggleMute, toggleCamera, registerListeners,
    };
}