import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../socket";
import { Message } from "../utils/types";
import { usePrivateHistory } from "../hooks/queries/usePrivateHistory";
import { showToast } from "../utils/showToaster";
import EmojiPickerButton from "./EmojiPickerButton";

interface OneToOneProps {
    username: string;
    selectedUser: string | null;
    usersById: Record<string, { _id: string; firstName: string; lastName: string; email: string }>;
    onlineUserIds: string[];
}

export default function OneToOne({ username, selectedUser, usersById, onlineUserIds }: OneToOneProps) {

    const selectedUserName = selectedUser
    ? `${usersById[selectedUser]?.firstName ?? ""} ${usersById[selectedUser]?.lastName ?? ""}`.trim() || selectedUser
    : "";
    const isSelectedUserOnline = selectedUser ? onlineUserIds.includes(selectedUser) : false;
    const [message, setMessage] = useState("");
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: messages = [], isLoading, isError, } = usePrivateHistory(username, selectedUser);

    useEffect(() => {
        const handleMessage = (newMessage: Message) => {
            const belongsToCurrentUser =
                newMessage.from === username ||
                newMessage.to === username;

            if (!belongsToCurrentUser) {
                return;
            }

            if (!newMessage.to) {
                return;
            }

            const isCurrentConversation =
                (newMessage.from === username &&
                    newMessage.to === selectedUser) ||
                (newMessage.from === selectedUser &&
                    newMessage.to === username);

            if (!isCurrentConversation) {
                return;
            }

            queryClient.setQueryData<Message[]>(
                ["privateMessages", username, selectedUser],
                (previousMessages = []) => {
                    const alreadyExists = previousMessages.some(
                        (msg) => msg.id === newMessage.id
                    );

                    if (alreadyExists) {
                        return previousMessages;
                    }

                    return [...previousMessages, newMessage].sort(
                        (a, b) => a.timestamp - b.timestamp
                    );
                }
            );
        };

        socket.on("receivePrivateMessage", handleMessage);

        return () => {
            socket.off("receivePrivateMessage", handleMessage);
        };
    }, [queryClient, username, selectedUser]);

    useEffect(() => {
        const handleTyping = (userId: string) => {
            if (userId === selectedUser) {
                setTypingUser(userId);
            }
        };

        const handleStopTyping = (userId: string) => {
            if (userId === selectedUser) {
                setTypingUser(null);
            }
        };

        socket.on("typing", handleTyping);
        socket.on("stopTyping", handleStopTyping);

        return () => {
            socket.off("typing", handleTyping);
            socket.off("stopTyping", handleStopTyping);
        };
    }, [selectedUser]);

    const currentConversationMessages = useMemo(() => {
        if (!selectedUser) {
            return [];
        }

        return messages.filter((msg) => {
            return (
                (msg.from === username && msg.to === selectedUser) ||
                (msg.from === selectedUser && msg.to === username)
            );
        });
    }, [messages, username, selectedUser]);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const trimmedMessage = message.trim();

        if (!selectedUser || !trimmedMessage) {
            return;
        }

        if (!socket.connected) {
            showToast(
                "You're offline. Reconnecting...",
                "error"
            );
            return;
        }

        socket.emit("sendPrivateMessage", {
            to: selectedUser,
            content: trimmedMessage,
        });

        socket.emit("stopTyping", {
            to: selectedUser,
        });

        setMessage("");
    };

    const handleTyping = (value: string) => {
        setMessage(value);

        if (!selectedUser || !socket.connected) {
            return;
        }

        if (value.trim()) {
            socket.emit("typing", {
                to: selectedUser,
            });
        } else {
            socket.emit("stopTyping", {
                to: selectedUser,
            });
        }
    };

    if (!selectedUser) {
        return (
            <div className="flex h-full flex-1 items-center justify-center bg-slate-900 px-4">
                <div className="text-center">
                    <div className="mb-4 text-5xl sm:text-6xl">
                        👋
                    </div>

                    <h2 className="text-xl font-bold text-white sm:text-2xl">
                        Start a conversation
                    </h2>

                    <p className="mt-2 text-sm text-slate-400 sm:text-base">
                        Select an online user from the sidebar
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-900">
            <header className="shrink-0 border-b border-slate-800 px-4 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white sm:h-11 sm:w-11">
                        {selectedUserName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                        <h2 className="truncate font-semibold text-white">
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
                            <div className="mb-3 text-4xl">
                                💬
                            </div>

                            <p className="text-slate-400">
                                Loading messages...
                            </p>
                        </div>
                    </div>
                )}

                {isError && !isLoading && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <div className="mb-3 text-4xl">
                                ⚠️
                            </div>

                            <p className="font-semibold text-red-400">
                                Failed to load messages
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Please try again later.
                            </p>
                        </div>
                    </div>
                )}

                {!isLoading &&
                    !isError &&
                    currentConversationMessages.length === 0 && (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                                <div className="mb-3 text-4xl">
                                    💬
                                </div>

                                <p className="text-slate-500">
                                    No messages yet
                                </p>

                                <p className="mt-1 text-sm text-slate-600">
                                    Start a conversation with{" "}
                                    {selectedUserName}
                                </p>
                            </div>
                        </div>
                    )}

                {!isLoading &&
                    !isError &&
                    currentConversationMessages.map((msg) => {
                        const mine = msg.from === username;

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${mine
                                    ? "justify-end"
                                    : "justify-start"
                                    }`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-md ${mine
                                        ? "rounded-br-md bg-indigo-600 text-white"
                                        : "rounded-bl-md bg-slate-800 text-slate-100"
                                        }`}
                                >
                                    <p className="break-words text-sm">
                                        {msg.content}
                                    </p>

                                    <p className="mt-1 text-[10px] opacity-60">
                                        {new Date(
                                            msg.timestamp
                                        ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                {typingUser && (
                    <div className="text-sm text-slate-500">
                        {typingUser} is typing...
                    </div>
                )}
            </div>

            <form
                onSubmit={handleSubmit}
                className="shrink-0 border-t border-slate-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
            >
                <div className="flex gap-2 sm:gap-3">
                    <input
                        value={message}
                        onChange={(e) =>
                            handleTyping(e.target.value)
                        }
                        placeholder={`Message ${selectedUserName}...`}
                        className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-indigo-500"
                    />

                    <EmojiPickerButton
                        onEmojiSelect={(emoji) =>
                            handleTyping(message + emoji)
                        }
                    />

                    <button
                        type="submit"
                        disabled={
                            !socket.connected ||
                            !message.trim()
                        }
                        className="shrink-0 rounded-xl bg-indigo-600 px-4 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}