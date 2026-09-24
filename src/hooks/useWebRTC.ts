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
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const activeCallIdRef = useRef<string | null>(null);

    const cleanup = useCallback(() => {
        const pc = pcRef.current;
        pcRef.current = null;

        if (pc) {
            pc.onicecandidate = null;
            pc.ontrack = null;
            pc.oniceconnectionstatechange = null;
            pc.onconnectionstatechange = null;
            pc.close();
        }

        localStreamRef.current?.getTracks().forEach((track) => track.stop());
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
    }, []);

    const createPeerConnection = useCallback(
        (remoteUserIdArg: string, callId: string) => {
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }

            pendingCandidatesRef.current = [];
            remoteStreamRef.current = null;

            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

            pc.onicecandidate = (event) => {
                if (!event.candidate || activeCallIdRef.current !== callId) return;

                console.log(
                    "ICE candidate:",
                    event.candidate.type,
                    event.candidate.protocol,
                    event.candidate.address
                );

                socket.emit("iceCandidate", {
                    to: remoteUserIdArg,
                    candidate: event.candidate.toJSON(),
                    callId,
                });
            };

            pc.ontrack = (event) => {
                if (activeCallIdRef.current !== callId) return;

                console.log("Remote track received:", event.track.kind);

                if (!remoteStreamRef.current) {
                    remoteStreamRef.current = new MediaStream();
                    setRemoteStream(remoteStreamRef.current);
                }

                const stream = remoteStreamRef.current;

                if (!stream.getTracks().some((track) => track.id === event.track.id)) {
                    stream.addTrack(event.track);
                }
            };

            pc.oniceconnectionstatechange = () => {
                console.log("ICE connection state:", pc.iceConnectionState);

                if (
                    pc.iceConnectionState === "failed" &&
                    activeCallIdRef.current === callId
                ) {
                    setCallError("Connection failed. Please try the call again.");
                    cleanup();
                }
            };

            pc.onconnectionstatechange = () => {
                console.log("Peer connection state:", pc.connectionState);

                if (activeCallIdRef.current !== callId) return;

                if (pc.connectionState === "connected") {
                    setCallStatus("connected");
                }

                if (["failed", "closed"].includes(pc.connectionState)) {
                    cleanup();
                }
            };

            pcRef.current = pc;
            return pc;
        },
        [cleanup]
    );

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
                    throw new Error("Camera or microphone is already in use.");
                }

                if (error.name === "NotAllowedError") {
                    throw new Error("Camera/microphone permission was denied.");
                }

                if (error.name === "NotFoundError") {
                    throw new Error("No camera or microphone was found.");
                }
            }

            throw error;
        }
    }, []);

    const startCall = useCallback(
        async (
            targetUserId: string,
            conversationId: string,
            type: "audio" | "video"
        ) => {
            try {
                cleanup();
                setCallError(null);
                setCallType(type);
                setCallStatus("calling");

                remoteUserRef.current = targetUserId;
                conversationIdRef.current = conversationId;
                setRemoteUserId(targetUserId);

                const callId = crypto.randomUUID();
                activeCallIdRef.current = callId;

                const stream = await getLocalMedia(type);

                if (activeCallIdRef.current !== callId) return;

                const pc = createPeerConnection(targetUserId, callId);

                stream.getTracks().forEach((track) => {
                    pc.addTrack(track, stream);
                });

                const offer = await pc.createOffer();

                if (activeCallIdRef.current !== callId) return;

                await pc.setLocalDescription(offer);

                socket.emit("callUser", {
                    to: targetUserId,
                    conversationId,
                    offer: pc.localDescription,
                    callType: type,
                    callId,
                });
            } catch (error) {
                console.error("Failed to start call:", error);
                setCallError(
                    error instanceof Error ? error.message : "Failed to start call"
                );
                cleanup();
            }
        },
        [cleanup, createPeerConnection, getLocalMedia]
    );

    const addPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
        const candidates = [...pendingCandidatesRef.current];
        pendingCandidatesRef.current = [];

        for (const candidate of candidates) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.warn("Failed to add queued ICE candidate:", error);
            }
        }
    }, []);

    const acceptCall = useCallback(async () => {
        if (!incomingCall) return;

        try {
            setCallError(null);

            const {
                from,
                offer,
                callType: incomingType,
                conversationId,
                callId,
            } = incomingCall;

            activeCallIdRef.current = callId;
            setCallType(incomingType);
            setCallStatus("ringing");

            remoteUserRef.current = from;
            conversationIdRef.current = conversationId;
            setRemoteUserId(from);

            const stream = await getLocalMedia(incomingType);

            if (activeCallIdRef.current !== callId) return;

            const pc = createPeerConnection(from, callId);

            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            await addPendingCandidates(pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("answerCall", {
                to: from,
                conversationId,
                answer: pc.localDescription,
                callId,
            });

            setIncomingCall(null);
        } catch (error) {
            console.error("Failed to accept call:", error);
            setCallError(
                error instanceof Error ? error.message : "Failed to accept call"
            );
            cleanup();
        }
    }, [
        incomingCall,
        cleanup,
        createPeerConnection,
        getLocalMedia,
        addPendingCandidates,
    ]);

    const rejectCall = useCallback(() => {
        if (!incomingCall) return;

        socket.emit("rejectCall", {
            to: incomingCall.from,
            conversationId: incomingCall.conversationId,
        });

        setIncomingCall(null);
        setCallStatus("idle");
    }, [incomingCall]);

    const endCall = useCallback(() => {
        if (remoteUserRef.current && conversationIdRef.current) {
            socket.emit("endCall", {
                to: remoteUserRef.current,
                conversationId: conversationIdRef.current,
            });
        }

        cleanup();
    }, [cleanup]);

    const toggleMute = useCallback(() => {
        if (!localStreamRef.current) return;

        const muted = !isMuted;

        localStreamRef.current
            .getAudioTracks()
            .forEach((track) => (track.enabled = !muted));

        setIsMuted(muted);
    }, [isMuted]);

    const toggleCamera = useCallback(() => {
        if (!localStreamRef.current) return;

        const cameraOff = !isCameraOff;

        localStreamRef.current
            .getVideoTracks()
            .forEach((track) => (track.enabled = !cameraOff));

        setIsCameraOff(cameraOff);
    }, [isCameraOff]);

    const registerListeners = useCallback(() => {
        const handleIncomingCall = (data: IncomingCallData) => {
            if (pcRef.current || activeCallIdRef.current) {
                socket.emit("rejectCall", {
                    to: data.from,
                    conversationId: data.conversationId,
                });
                return;
            }

            setIncomingCall(data);
            setCallType(data.callType);
            setCallStatus("ringing");
        };

        const handleCallAnswered = async (data: {
            from: string;
            conversationId: string;
            answer: RTCSessionDescriptionInit;
            callId: string;
        }) => {
            if (data.callId !== activeCallIdRef.current) return;

            const pc = pcRef.current;

            if (!pc || pc.signalingState === "closed") return;

            try {
                await pc.setRemoteDescription(
                    new RTCSessionDescription(data.answer)
                );

                await addPendingCandidates(pc);
            } catch (error) {
                console.error("Failed to process answer:", error);
            }
        };

        const handleIceCandidate = async (data: {
            from: string;
            candidate: RTCIceCandidateInit;
            callId: string;
        }) => {
            if (data.callId !== activeCallIdRef.current) return;

            const pc = pcRef.current;

            if (!pc || pc.signalingState === "closed") return;

            if (!pc.remoteDescription) {
                pendingCandidatesRef.current.push(data.candidate);
                return;
            }

            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
                console.warn("Failed to add ICE candidate:", error);
            }
        };

        const handleCallRejected = () => cleanup();
        const handleCallEnded = () => cleanup();

        const handleCallUserOffline = () => {
            setCallError("That user is offline.");
            cleanup();
        };
        const handleCallBusy = (data: { userId: string; message: string }) => {
            setCallError(data.message);
            setCallStatus("idle");
        };
        socket.on("incomingCall", handleIncomingCall);
        socket.on("callAnswered", handleCallAnswered);
        socket.on("iceCandidateReceived", handleIceCandidate);
        socket.on("callRejected", handleCallRejected);
        socket.on("callEnded", handleCallEnded);
        socket.on("callUserOffline", handleCallUserOffline);
        socket.on("callBusy", handleCallBusy);
        return () => {
            socket.off("incomingCall", handleIncomingCall);
            socket.off("callAnswered", handleCallAnswered);
            socket.off("iceCandidateReceived", handleIceCandidate);
            socket.off("callRejected", handleCallRejected);
            socket.off("callEnded", handleCallEnded);
            socket.off("callUserOffline", handleCallUserOffline);
            socket.off("callBusy", handleCallBusy);
        };
    }, [cleanup, addPendingCandidates]);

    return {
        callStatus,
        callType,
        incomingCall,
        remoteUserId,
        localStream,
        remoteStream,
        isMuted,
        isCameraOff,
        callError,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
        registerListeners,
    };
}
