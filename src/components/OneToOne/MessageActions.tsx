import {
    FiCornerUpLeft,
    FiCornerUpRight,
    FiMoreVertical,
    FiTrash2,
    FiType,
} from "react-icons/fi";
import { Message } from "../../utils/types";

interface MessageActionsProps {
    msg: Message;
    mine: boolean;
    isMenuOpen: boolean;
    onToggleMenu: (messageId: string | null) => void;
    onReply: (msg: Message) => void;
    onStartEdit: (msg: Message) => void;
    onForward: (msg: Message) => void;
    onDeleteForMe: (messageId: string) => void;
    onDeleteForEveryone: (messageId: string) => void;
}

export default function MessageActions({
    msg,
    mine,
    isMenuOpen,
    onToggleMenu,
    onReply,
    onStartEdit,
    onForward,
    onDeleteForMe,
    onDeleteForEveryone,
}: MessageActionsProps) {
    return (
        <div className="absolute right-1 top-1">
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();

                    onToggleMenu(isMenuOpen ? null : msg.id);
                }}
                className={`rounded p-0.5 ${
                    mine
                        ? "text-white/70 hover:bg-white/10 hover:text-white"
                        : "text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                }`}
                aria-label="Message options"
            >
                <FiMoreVertical />
            </button>

            {isMenuOpen && (
                <div
                    className={`absolute top-6 z-50 w-44 overflow-hidden rounded-lg bg-blue-50 py-1 text-xs shadow-lg ${
                        mine ? "right-0" : "left-0"
                    }`}
                >
                    {/* Reply */}
                    <button
                        type="button"
                        onClick={() => {
                            onReply(msg);
                            onToggleMenu(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-blue-700 hover:bg-blue-100"
                    >
                        <FiCornerUpLeft className="shrink-0" />
                        Reply
                    </button>

                    {/* Edit - sender's text messages only */}
                    {mine && msg.type === "text" && (
                        <button
                            type="button"
                            onClick={() => onStartEdit(msg)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-blue-700 hover:bg-blue-100"
                        >
                            <FiType className="shrink-0" />
                            Edit
                        </button>
                    )}

                    {/* Forward */}
                    <button
                        type="button"
                        onClick={() => onForward(msg)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-blue-700 hover:bg-blue-100"
                    >
                        <FiCornerUpRight className="shrink-0" />
                        Forward
                    </button>

                    {/* Delete for me */}
                    {mine && (
                        <button
                            type="button"
                            onClick={() => onDeleteForMe(msg.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-blue-700 hover:bg-blue-100"
                        >
                            <FiTrash2 className="shrink-0" />
                            Delete for me
                        </button>
                    )}

                    {/* Delete for everyone */}
                    {mine && (
                        <button
                            type="button"
                            onClick={() => onDeleteForEveryone(msg.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-100"
                        >
                            <FiTrash2 className="shrink-0" />
                            Delete for everyone
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}