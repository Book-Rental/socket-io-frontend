import { FiCornerUpRight, FiFile, FiMic } from "react-icons/fi";
import { Message } from "../../utils/types";
import { formatDuration, formatFileSize, linkifyText } from "./MessageUtils";
import FormattedMessage from "../FormattedMessage";
import MessageActions from "./MessageActions";
import ReplyMessagePreview from "./ReplyMessagePreview";

interface MessageBubbleProps {
    msg: Message;
    mine: boolean;
    selectionMode: boolean;
    isSelected: boolean;
    isEditing: boolean;
    editText: string;
    isMenuOpen: boolean;
    onToggleSelect: (messageId: string) => void;
    onStartEdit: (msg: Message) => void;
    onEditTextChange: (value: string) => void;
    onSubmitEdit: () => void;
    onCancelEdit: () => void;
    onToggleMenu: (messageId: string | null) => void;
    onReply: (msg: Message) => void;
    onForward: (msg: Message) => void;
    onDeleteForMe: (messageId: string) => void;
    onDeleteForEveryone: (messageId: string) => void;
}

function renderMessageContent(msg: Message) {
    if (msg.deletedForEveryone || msg.deletedForMe) {
        return (
            <p className="break-words text-sm italic opacity-60">
                This message was deleted
            </p>
        );
    }

    switch (msg.type) {
        case "image":
            return (
                <div>
                    <a
                        href={msg.content?.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <img
                            src={msg.content?.mediaUrl}
                            alt={msg.content?.fileName ?? "image"}
                            className="max-h-64 w-full rounded-lg object-cover"
                        />
                    </a>

                    {msg.content?.caption && (
                        <p className="mt-1 break-words text-sm">
                            {linkifyText(msg.content.caption)}
                        </p>
                    )}
                </div>
            );

        case "video":
            return (
                <div>
                    <video
                        src={msg.content?.mediaUrl}
                        controls
                        className="max-h-64 w-full rounded-lg"
                    />

                    {msg.content?.caption && (
                        <p className="mt-1 break-words text-sm">
                            {linkifyText(msg.content.caption)}
                        </p>
                    )}
                </div>
            );

        case "audio":
            return (
                <div className="flex items-center gap-1">
                    <FiMic className="shrink-0 text-lg opacity-70" />

                    <audio
                        src={msg.content?.mediaUrl}
                        controls
                        className="h-8 w-52 sm:w-60"
                    />

                    {typeof msg.content?.duration === "number" && (
                        <span className="shrink-0 text-[10px] opacity-70">
                            {formatDuration(msg.content.duration)}
                        </span>
                    )}
                </div>
            );

        case "file":
            return (
                <a
                    href={msg.content?.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2 hover:bg-black/20"
                >
                    <FiFile className="shrink-0 text-xl" />

                    <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                            {msg.content?.fileName ?? "File"}
                        </span>

                        <span className="block text-xs opacity-70">
                            {formatFileSize(msg.content?.fileSize)}
                        </span>
                    </span>
                </a>
            );

        default:
            return (
                <FormattedMessage text={msg.content?.text ?? ""} />
            );
    }
}

export default function MessageBubble({
    msg,
    mine,
    selectionMode,
    isSelected,
    isEditing,
    editText,
    isMenuOpen,
    onToggleSelect,
    onStartEdit,
    onEditTextChange,
    onSubmitEdit,
    onCancelEdit,
    onToggleMenu,
    onReply,
    onForward,
    onDeleteForMe,
    onDeleteForEveryone,
}: MessageBubbleProps) {
    const forwardCount =
        msg.forwarded
            ? Math.max(1, msg.forwardCount ?? 1)
            : 0;

    return (
        <div
            className={`flex ${mine ? "justify-end" : "justify-start"}`}
            onClick={() => {
                if (selectionMode) onToggleSelect(msg.id ?? msg.tempId);
            }}
        >
            <div className="flex items-center gap-2">
                {selectionMode && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggleSelect(msg.id ?? msg.tempId);
                        }}
                        className="shrink-0"
                    >
                        <span
                            className={`flex h-5 w-5 items-center justify-center rounded border ${isSelected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-300 bg-white"
                                }`}
                        >
                            {isSelected && (
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="h-3.5 w-3.5"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.415 0l-3.25-3.25a1 1 0 111.415-1.42l2.543 2.544 6.543-6.544a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            )}
                        </span>
                    </button>
                )}

                <div
                    className={`relative max-w-[85%] rounded-2xl px-4 py-3 pr-7 sm:max-w-md ${isSelected ? "ring-2 ring-blue-400 ring-offset-2" : ""
                        } ${mine
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md bg-slate-100 text-slate-800"
                        }`}
                >
                    {isEditing ? (
                        <div className="flex gap-2">
                            <input
                                value={editText}
                                onChange={(e) =>
                                    onEditTextChange(e.target.value)
                                }
                                className="flex-1 rounded bg-slate-700 px-2 py-1 text-sm text-white outline-none"
                                autoFocus
                            />

                            <button
                                type="button"
                                onClick={onSubmitEdit}
                                className="text-xs font-semibold text-emerald-300"
                            >
                                Save
                            </button>

                            <button
                                type="button"
                                onClick={onCancelEdit}
                                className="text-xs font-semibold text-white"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <>
                            {forwardCount > 0 && (
                                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium italic opacity-70">
                                    <span className="flex items-center">
                                        {Array.from({
                                            length: Math.min(
                                                forwardCount,
                                                10
                                            ),
                                        }).map((_, index) => (
                                            <FiCornerUpRight
                                                key={`${msg.id}-forward-${index}`}
                                                className={`h-3 w-3 shrink-0 ${index > 0 ? "-ml-0.5" : ""
                                                    }`}
                                            />
                                        ))}
                                    </span>

                                    <span>
                                        Forwarded
                                        {forwardCount > 1 &&
                                            ` ×${forwardCount}`}
                                    </span>
                                </div>
                            )}

                            {msg.replyTo && (
                                <ReplyMessagePreview
                                    senderName={msg.replyTo.senderId}
                                    text={
                                        msg.replyTo.text ||
                                        (msg.replyTo.type === "image"
                                            ? "📷 Photo"
                                            : msg.replyTo.type === "video"
                                                ? "🎥 Video"
                                                : msg.replyTo.type === "audio"
                                                    ? "🎤 Voice message"
                                                    : msg.replyTo.type === "file"
                                                        ? `📄 ${msg.replyTo.fileName ?? "File"}`
                                                        : "Message")
                                    }
                                />
                            )}

                            {renderMessageContent(msg)}
                        </>
                    )}

                    <div className="mt-1 flex items-center gap-1 text-[10px] opacity-60">
                        <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>

                        {mine && !msg.deletedForEveryone && !msg.deletedForMe && (
                            <span
                                className={
                                    msg.status === "read"
                                        ? "font-bold text-blue-400"
                                        : msg.status === "delivered"
                                            ? "font-bold text-white"
                                            : "text-white/50"
                                }
                            >
                                {msg.status === "sent" ? "✓" : "✓✓"}
                            </span>
                        )}
                    </div>
                    {!msg.deletedForEveryone && !msg.deletedForMe && !selectionMode && !isEditing && (
                        <MessageActions
                            msg={msg}
                            mine={mine}
                            isMenuOpen={isMenuOpen}
                            onToggleMenu={onToggleMenu}
                            onReply={onReply}
                            onStartEdit={onStartEdit}
                            onForward={onForward}
                            onDeleteForMe={onDeleteForMe}
                            onDeleteForEveryone={onDeleteForEveryone}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}