import { useEffect, useRef, useState } from "react";
import {
    FiMic,
    FiMicOff,
    FiPhoneOff,
    FiVideo,
    FiVideoOff,
    FiMinimize2,
} from "react-icons/fi";
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
    callError: string | null;
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
    callError,
    onEndCall,
}: VideoCallProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const video = remoteVideoRef.current;
        const audio = remoteAudioRef.current;

        if (video) video.srcObject = remoteStream;
        if (audio) audio.srcObject = remoteStream;

        if (remoteStream) {
            video?.play().catch(() => { });
            audio?.play().catch(() => { });
        }
    }, [remoteStream]);

    useEffect(() => {
        const video = localVideoRef.current;

        if (!video) return;

        video.srcObject = localStream;

        if (localStream) {
            video.play().catch(() => { });
        }
    }, [localStream]);

    if (callStatus === "idle") return null;

    const showRemoteVideo =
        callType === "video" && !!remoteStream?.getVideoTracks().length;

    const showLocalPreview =
        callType === "video" && !!localStream && !isMinimized;

    return (
        <div
            onClick={() => isMinimized && setIsMinimized(false)}
            className={
                isMinimized
                    ? "fixed bottom-4 right-4 z-50 h-16 w-16 cursor-pointer overflow-hidden rounded-full border-2 border-white shadow-xl"
                    : "fixed bottom-4 right-4 z-50 flex h-[420px] w-80 flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl sm:h-[480px] sm:w-96"
            }
        >
            {callError && (
                <div className="absolute left-1/2 top-4 z-[60] -translate-x-1/2 rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
                    {callError}
                </div>
            )}
            <audio ref={remoteAudioRef} autoPlay />

            <div className="relative flex-1">
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={
                        showRemoteVideo
                            ? "h-full w-full object-cover"
                            : "hidden"
                    }
                />

                {!showRemoteVideo && (
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="text-center text-white">
                            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-semibold">
                                {remoteUserName.charAt(0).toUpperCase()}
                            </div>

                            <p className="text-base font-medium">
                                {remoteUserName}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                                {callStatus === "calling" && "Calling..."}
                                {callStatus === "ringing" && "Ringing..."}
                                {callStatus === "connected" && "Connected"}
                            </p>
                        </div>
                    </div>
                )}

                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={
                        showLocalPreview
                            ? "absolute bottom-3 right-3 h-20 w-16 rounded-lg border-2 border-white/20 object-cover shadow-lg"
                            : "hidden"
                    }
                />

                {!isMinimized && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMinimized(true);
                        }}
                        className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
                        aria-label="Minimize call"
                    >
                        <FiMinimize2 size={14} />
                    </button>
                )}
            </div>

            {!isMinimized && (
                <div className="flex items-center justify-center gap-3 bg-slate-900/95 p-4">
                    <button
                        type="button"
                        onClick={onToggleMute}
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${isMuted
                            ? "bg-white text-slate-900"
                            : "bg-white/20 text-white"
                            }`}
                    >
                        {isMuted ? (
                            <FiMicOff size={16} />
                        ) : (
                            <FiMic size={16} />
                        )}
                    </button>

                    {callType === "video" && (
                        <button
                            type="button"
                            onClick={onToggleCamera}
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${isCameraOff
                                ? "bg-white text-slate-900"
                                : "bg-white/20 text-white"
                                }`}
                        >
                            {isCameraOff ? (
                                <FiVideoOff size={16} />
                            ) : (
                                <FiVideo size={16} />
                            )}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onEndCall}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500"
                    >
                        <FiPhoneOff size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}
