import { FiAlertTriangle, FiMessageCircle } from "react-icons/fi";
import { Message } from "../../utils/types";
import MessageBubble from "./MessageBubble";
import { useEffect, useRef } from "react";

interface MessageListProps {
    messages: Message[];
    username: string;
    selectedUserName: string;
    isLoading: boolean;
    isError: boolean;
    typingUser: string | null;
    selectionMode: boolean;
    selectedMessageIds: Set<string>;
    editingMessageId: string | null;
    editText: string;
    menuOpenId: string | null;
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

export default function MessageList({
    messages,
    username,
    selectedUserName,
    isLoading,
    isError,
    typingUser,
    selectionMode,
    selectedMessageIds,
    editingMessageId,
    editText,
    menuOpenId,
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
}: MessageListProps) {
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const container = messagesContainerRef.current;

        if (!container) return;

        container.scrollTop = container.scrollHeight;
    }, [messages]);

    return (
        <div
            ref={messagesContainerRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-6">

            {isLoading && (
                <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                        <FiMessageCircle className="mx-auto mb-3 text-4xl text-slate-400" />
                        <p className="text-slate-400">Loading messages...</p>
                    </div>
                </div>
            )}

            {isError && !isLoading && (
                <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                        <FiAlertTriangle className="mx-auto mb-3 text-4xl text-red-400" />
                        <p className="font-semibold text-red-400">
                            Failed to load messages
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Please try again later.
                        </p>
                    </div>
                </div>
            )}

            {!isLoading && !isError && messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                        <FiMessageCircle className="mx-auto mb-3 text-4xl text-slate-400" />
                        <p className="text-slate-500">No messages yet</p>
                        <p className="mt-1 text-sm text-slate-600">
                            Start a conversation with {selectedUserName}
                        </p>
                    </div>
                </div>
            )}

            {!isLoading &&
                !isError &&
                messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        msg={msg}
                        mine={msg.senderId === username}
                        selectionMode={selectionMode}
                        isSelected={selectedMessageIds.has(msg.id ?? msg.tempId)}
                        isEditing={editingMessageId === msg.id}
                        editText={editText}
                        isMenuOpen={menuOpenId === msg.id}
                        onToggleSelect={onToggleSelect}
                        onStartEdit={onStartEdit}
                        onEditTextChange={onEditTextChange}
                        onSubmitEdit={onSubmitEdit}
                        onCancelEdit={onCancelEdit}
                        onToggleMenu={onToggleMenu}
                        onReply={onReply}
                        onForward={onForward}
                        onDeleteForMe={onDeleteForMe}
                        onDeleteForEveryone={onDeleteForEveryone}
                    />
                ))}

            {typingUser && (
                <div className="text-sm text-slate-500">
                    {selectedUserName || typingUser} is typing...
                </div>
            )}
        </div>
    );
}