import { FiPhone, FiPhoneOff, FiVideo } from "react-icons/fi";

interface IncomingCallModalProps {
    callerName: string;
    callType: "audio" | "video";
    onAccept: () => void;
    onReject: () => void;
}

export default function IncomingCallModal({
    callerName,
    callType,
    onAccept,
    onReject,
}: IncomingCallModalProps) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
            <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-semibold text-blue-600">
                    {callerName.charAt(0).toUpperCase()}
                </div>

                <p className="text-lg font-semibold text-slate-800">{callerName}</p>
                <p className="mt-1 text-sm text-slate-500">
                    Incoming {callType === "video" ? "video" : "audio"} call...
                </p>

                <div className="mt-6 flex items-center justify-center gap-6">
                    <button
                        type="button"
                        onClick={onReject}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500"
                        aria-label="Reject call"
                    >
                        <FiPhoneOff size={22} />
                    </button>

                    <button
                        type="button"
                        onClick={onAccept}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-500"
                        aria-label="Accept call"
                    >
                        {callType === "video" ? <FiVideo size={22} /> : <FiPhone size={22} />}
                    </button>
                </div>
            </div>
        </div>
    );
}