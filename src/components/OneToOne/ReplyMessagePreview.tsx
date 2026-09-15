import { FiCornerUpLeft } from "react-icons/fi";

interface ReplyMessagePreviewProps {
    senderName: string;
    text: string;
    onClick?: () => void;
}

export default function ReplyMessagePreview({
    senderName,
    text,
    onClick,
}: ReplyMessagePreviewProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="mb-2 flex w-full min-w-0 items-stretch overflow-hidden rounded-md bg-black/10 text-left transition hover:bg-black/15"
        >
            <div className="flex w-1 shrink-0 bg-current opacity-50" />

            <div className="min-w-0 flex-1 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5">
                    <FiCornerUpLeft className="h-3 w-3 shrink-0 opacity-70" />

                    <p className="truncate text-[11px] font-semibold">
                        {senderName}
                    </p>
                </div>

                <p className="mt-0.5 truncate text-xs opacity-70">
                    {text}
                </p>
            </div>
        </button>
    );
}