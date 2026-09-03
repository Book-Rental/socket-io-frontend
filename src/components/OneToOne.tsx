import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../socket";
import { Message } from "../utils/types";
import { useConversationHistory } from "../hooks/queries/useConversationHistory";
import { showToast } from "../utils/showToaster";
import EmojiPickerButton from "./EmojiPickerButton";
import { ConversationSummary } from "../utils/chatApi";

interface OneToOneProps {
    username: string;
    selectedUser: string | null;
    selectedConversationId: string | null;
    usersById: Record<string, { _id: string; firstName: string; lastName: string; email: string }>;
    onlineUserIds: string[];
}

export default function OneToOne({
    username,
    selectedUser,
    selectedConversationId,
    usersById,
    onlineUserIds,
}: OneToOneProps) {

    const selectedUserName = selectedUser
        ? `${usersById[selectedUser]?.firstName ?? ""} ${usersById[selectedUser]?.lastName ?? ""}`.trim() || selectedUser
        : "";
    const isSelectedUserOnline = selectedUser ? onlineUserIds.includes(selectedUser) : false;
    const [message, setMessage] = useState("");
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const { data: messages = [], isLoading, isError } = useConversationHistory(selectedConversationId);

    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    

    useEffect(() => {
        const handleIncoming = (newMessage: Message) => {
            if (newMessage.conversationId !== selectedConversationId) {
                return;
            }

            queryClient.setQueryData<Message[]>(
                ["conversationMessages", selectedConversationId],
                (previousMessages = []) => {
                    const alreadyExists = previousMessages.some(
                        (msg) => msg.id === newMessage.id
                    );
                    if (alreadyExists) {
                        return previousMessages;
                    }
                    return [...previousMessages, newMessage].sort(
                        (a, b) =>
                            new Date(a.createdAt).getTime() -
                            new Date(b.createdAt).getTime()
                    );
                }
            );
        };

        socket.on("messageNew", handleIncoming);
        socket.on("messageSent", handleIncoming);

        return () => {
            socket.off("messageNew", handleIncoming);
            socket.off("messageSent", handleIncoming);
        };
    }, [queryClient, selectedConversationId]);

    useEffect(() => {
        const handleTyping = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
            if (conversationId === selectedConversationId) {
                setTypingUser(userId);
            }
        };

        const handleStopTyping = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
            if (conversationId === selectedConversationId && userId === typingUser) {
                setTypingUser(null);
            }
        };

        socket.on("typingStarted", handleTyping);
        socket.on("typingStopped", handleStopTyping);

        return () => {
            socket.off("typingStarted", handleTyping);
            socket.off("typingStopped", handleStopTyping);
        };
    }, [selectedConversationId, typingUser]);

    const currentConversationMessages = useMemo(() => {
        if (!selectedConversationId) {
            return [];
        }
        return messages.filter(
            (msg) => msg.conversationId === selectedConversationId
        );
    }, [messages, selectedConversationId]);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const trimmedMessage = message.trim();

        if (!selectedConversationId || !trimmedMessage) {
            return;
        }

        if (!socket.connected) {
            showToast("You're offline. Reconnecting...", "error");
            return;
        }

        socket.emit("sendMessage", {
            conversationId: selectedConversationId,
            text: trimmedMessage,
            type: "text",
            clientMessageId: `${username}-${Date.now()}`,
        });

        socket.emit("typingStopped", {
            conversationId: selectedConversationId,
        });

        setMessage("");
    };

    const handleTyping = (value: string) => {
        setMessage(value);

        if (!selectedConversationId || !socket.connected) {
            return;
        }

        if (value.trim()) {
            socket.emit("typingStarted", {
                conversationId: selectedConversationId,
            });
        } else {
            socket.emit("typingStopped", {
                conversationId: selectedConversationId,
            });
        }
    };

    const startEdit = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditText(msg.content?.text ?? "");
    };

    const submitEdit = () => {
        if (!editingMessageId || !editText.trim()) return;
        socket.emit("editMessage", { messageId: editingMessageId, text: editText.trim() });
        setEditingMessageId(null);
        setEditText("");
    };

    const deleteMessage = (messageId: string, forEveryone: boolean) => {
        socket.emit("deleteMessage", { messageId, forEveryone });
    };

    useEffect(() => {
        const updateMessage = (updated: Message) => {
            queryClient.setQueryData<Message[]>(
                ["conversationMessages", selectedConversationId],
                (prev = []) => prev.map((m) => (m.id === updated.id ? updated : m))
            );
        };

        const handleDeleted = ({ messageId, deletedAt }: { messageId: string; deletedAt: string; forEveryone: boolean }) => {
            queryClient.setQueryData<Message[]>(
                ["conversationMessages", selectedConversationId],
                (prev = []) =>
                    prev.map((m) => (m.id === messageId ? { ...m, deletedAt, content: undefined } : m))
            );
        };

        const handleStatusUpdate = (data: { messageId: string; status: "delivered" | "read" }) => {
            queryClient.setQueryData<Message[]>(
                ["conversationMessages", selectedConversationId],
                (prev = []) =>
                    prev.map((m) => (m.id === data.messageId ? { ...m, status: data.status } : m))
            );
        };

        socket.on("messageEdited", updateMessage);
        socket.on("messageDeleted", handleDeleted);
        socket.on("messageDelivered", handleStatusUpdate);
        socket.on("messageRead", handleStatusUpdate);

        return () => {
            socket.off("messageEdited", updateMessage);
            socket.off("messageDeleted", handleDeleted);
            socket.off("messageDelivered", handleStatusUpdate);
            socket.off("messageRead", handleStatusUpdate);
        };
    }, [queryClient, selectedConversationId]);

    useEffect(() => {
        if (!selectedConversationId || currentConversationMessages.length === 0) return;

        const lastMessage = currentConversationMessages[currentConversationMessages.length - 1];
        if (lastMessage.senderId === username || lastMessage.status === "read") return;

        socket.emit("messagesRead", {
            conversationId: selectedConversationId,
            messageId: lastMessage.id,
        });
    }, [currentConversationMessages, selectedConversationId, username]);

    // useEffect(() => {
    //     if (!menuOpenId) return;
    //     const closeMenu = () => setMenuOpenId(null);
    //     window.addEventListener("click", closeMenu);
    //     return () => window.removeEventListener("click", closeMenu);
    // }, [menuOpenId]);

    useEffect(() => {
        const handleUnreadUpdate = (data: { conversationId: string; count: number }) => {
            queryClient.setQueryData<ConversationSummary[]>(
                ["userConversations", username],
                (prev = []) =>
                    prev.map((c) =>
                        c._id === data.conversationId ? { ...c, unreadCount: data.count } : c
                    )
            );
        };

        socket.on("unreadCountUpdated", handleUnreadUpdate);
        return () => {
            socket.off("unreadCountUpdated", handleUnreadUpdate);
        };
    }, [queryClient, username]);

    if (!selectedConversationId) {
        return (
            <div className="flex h-full flex-1 items-center justify-center bg-white px-4">
                <div className="text-center">
                    <div className="mb-4 text-5xl sm:text-6xl">👋</div>
                    <h2 className="text-xl font-bold text-white sm:text-2xl">
                        Start a conversation
                    </h2>
                    <p className="mt-2 text-sm text-slate-400 sm:text-base">
                        Search for a user above to begin chatting
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
            <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white sm:h-11 sm:w-11">
                        {selectedUserName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate font-semibold text-blue-600">
                            {selectedUserName}
                        </h2>
                        <p className={`text-xs ${isSelectedUserOnline ? "text-emerald-400" : "text-slate-500"}`}>
                            {isSelectedUserOnline ? "● Online" : "● Offline"}
                        </p>
                    </div>
                </div>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-6">
                {isLoading && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <div className="mb-3 text-4xl">💬</div>
                            <p className="text-slate-400">Loading messages...</p>
                        </div>
                    </div>
                )}

                {isError && !isLoading && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <div className="mb-3 text-4xl">⚠️</div>
                            <p className="font-semibold text-red-400">Failed to load messages</p>
                            <p className="mt-1 text-sm text-slate-500">Please try again later.</p>
                        </div>
                    </div>
                )}

                {!isLoading && !isError && currentConversationMessages.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <div className="mb-3 text-4xl">💬</div>
                            <p className="text-slate-500">No messages yet</p>
                            <p className="mt-1 text-sm text-slate-600">
                                Start a conversation with {selectedUserName}
                            </p>
                        </div>
                    </div>
                )}

                {!isLoading && !isError && currentConversationMessages.map((msg) => {
                    const mine = msg.senderId === username;
                    return (
                        <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`relative max-w-[85%] rounded-2xl px-4 py-3 pr-7 sm:max-w-md ${
                                    mine
                                        ? "rounded-br-md bg-indigo-600 text-white"
                                        : "rounded-bl-md bg-slate-100 text-slate-800"
                                }`}
                            >
                                {editingMessageId === msg.id ? (
                                    <div className="flex gap-2">
                                        <input
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            className="flex-1 rounded bg-slate-700 px-2 py-1 text-sm text-white outline-none"
                                            autoFocus
                                        />
                                        <button onClick={submitEdit} className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">Save</button>
                                        <button onClick={() => setEditingMessageId(null)} className="text-xs font-semibold text-white hover:text-slate-200">Cancel</button>
                                    </div>
                                ) : msg.deletedAt ? (
                                    <p className="break-words text-sm italic opacity-60">This message was deleted</p>
                                ) : (
                                    <p className="break-words text-sm">{msg.content?.text}</p>
                                )}

                                <div className="mt-1 flex items-center gap-1 text-[10px] opacity-60">
                                    <span>
                                        {new Date(msg.createdAt).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                    {mine && !msg.deletedAt && (
                                        <span className={msg.status === "read" ? "text-green-400" : "text-white/70"}>
                                            {msg.status === "read" || msg.status === "delivered" ? "✓✓" : "✓"}
                                        </span>
                                    )}
                                </div>

                                {mine && !msg.deletedAt && editingMessageId !== msg.id && (
                                    <div className="absolute right-1 top-1">
                                        <button
                                            onClick={() => setMenuOpenId(menuOpenId === msg.id ? null : msg.id)}
                                            className="rounded px-1 text-white/70 hover:bg-white/10 hover:text-white"
                                        >
                                            ⋮
                                        </button>
                                        {menuOpenId === msg.id && (
                                            <div className="absolute right-0 top-6 z-10 w-40 overflow-hidden rounded-lg bg-slate-700 py-1 text-xs shadow-lg">
                                                <button
                                                    onClick={() => { startEdit(msg); setMenuOpenId(null); }}
                                                    className="block w-full px-3 py-1.5 text-left text-white hover:bg-slate-600"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => { deleteMessage(msg.id, false); setMenuOpenId(null); }}
                                                    className="block w-full px-3 py-1.5 text-left text-white hover:bg-slate-600"
                                                >
                                                    Delete for me
                                                </button>
                                                <button
                                                    onClick={() => { deleteMessage(msg.id, true); setMenuOpenId(null); }}
                                                    className="block w-full px-3 py-1.5 text-left text-red-300 hover:bg-slate-600"
                                                >
                                                    Delete for everyone
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {typingUser && (
                    <div className="text-sm text-slate-500">
                        {selectedUserName || typingUser} is typing...
                    </div>
                )}
            </div>

            <form
                onSubmit={handleSubmit}
                className="shrink-0 border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
            >
                <div className="flex gap-2 sm:gap-3">
                    <input
                        value={message}
                        onChange={(e) => handleTyping(e.target.value)}
                        placeholder={`Message ${selectedUserName}...`}
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-500 focus:border-indigo-500"
                    />
                    <EmojiPickerButton onEmojiSelect={(emoji) => handleTyping(message + emoji)} />
                    <button
                        type="submit"
                        disabled={!socket.connected || !message.trim()}
                        className="shrink-0 rounded-xl bg-indigo-600 px-4 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}