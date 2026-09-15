import { FiX } from "react-icons/fi";
import { Message } from "../../utils/types";

interface ReplyPreviewProps {
    message: Message;
    senderName: string;
    onCancel: () => void;
}

function getReplyPreviewText(message: Message): string {
    if (message.deletedAt) {
        return "This message was deleted";
    }

    if (message.type === "text") {
        return message.content?.text || "";
    }

    if (message.type === "image") {
        return message.content?.caption
            ? `📷 ${message.content.caption}`
            : "📷 Photo";
    }

    if (message.type === "video") {
        return message.content?.caption
            ? `🎥 ${message.content.caption}`
            : "🎥 Video";
    }

    if (message.type === "audio") {
        return "🎤 Voice message";
    }

    if (message.type === "file") {
        return `📄 ${message.content?.fileName ?? "File"}`;
    }

    return "Message";
}

export default function ReplyPreview({
    message,
    onCancel,
}: ReplyPreviewProps) {
    const previewText = getReplyPreviewText(message);

    return (
        <div className="flex items-center gap-3 border-l-4 border-blue-600 bg-blue-50 px-3 py-2">
            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-blue-700">
                    Replying to 
                    {/* {senderName} */}
                </p>

                <p className="mt-0.5 truncate text-sm text-slate-600">
                    {previewText}
                </p>
            </div>

            <button
                type="button"
                onClick={onCancel}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-100 hover:text-slate-700"
                aria-label="Cancel reply"
            >
                <FiX className="h-4 w-4" />
            </button>
        </div>
    );
}