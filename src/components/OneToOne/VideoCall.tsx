import { useEffect, useRef } from "react";
import { FiMic, FiMicOff, FiPhoneOff, FiVideo, FiVideoOff } from "react-icons/fi";
import { CallStatus } from "../../hooks/useWebRTC";

interface VideoCallProps {
    callStatus: CallStatus;
    callType: "audio" | "video";
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isMuted: boolean;
    isCameraOff: boolean;
    remoteUserName: string;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onEndCall: () => void;
}

export default function VideoCall({
    callStatus,
    callType,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    remoteUserName,
    onToggleMute,
    onToggleCamera,
    onEndCall,
}: VideoCallProps) {
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    }, [remoteStream]);

    if (callStatus === "idle") return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
            <div className="relative flex-1">
                {callType === "video" && remoteStream ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="text-center text-white">
                            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-3xl font-semibold">
                                {remoteUserName.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-lg font-medium">{remoteUserName}</p>
                            <p className="mt-1 text-sm text-slate-400">
                                {callStatus === "calling" && "Calling..."}
                                {callStatus === "ringing" && "Ringing..."}
                                {callStatus === "connected" && "Connected"}
                            </p>
                        </div>
                    </div>
                )}

                {callType === "video" && localStream && (
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute bottom-4 right-4 h-32 w-24 rounded-lg border-2 border-white/20 object-cover shadow-lg sm:h-40 sm:w-32"
                    />
                )}
            </div>

            <div className="flex items-center justify-center gap-4 bg-slate-900/80 p-6">
                <button
                    type="button"
                    onClick={onToggleMute}
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${isMuted ? "bg-white text-slate-900" : "bg-white/20 text-white"
                        }`}
                >
                    {isMuted ? <FiMicOff /> : <FiMic />}
                </button>

                {callType === "video" && (
                    <button
                        type="button"
                        onClick={onToggleCamera}
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${isCameraOff ? "bg-white text-slate-900" : "bg-white/20 text-white"
                            }`}
                    >
                        {isCameraOff ? <FiVideoOff /> : <FiVideo />}
                    </button>
                )}

                <button
                    type="button"
                    onClick={onEndCall}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500"
                >
                    <FiPhoneOff size={22} />
                </button>
            </div>
        </div>
    );
}