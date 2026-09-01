import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import {
    useQueryClient,
} from "@tanstack/react-query";

import { socket } from "../socket";
import { useBroadcastHistory } from "../hooks/queries/useBroadcastHistory";
import { showToast } from "../utils/showToaster";
import { BookRentalUser } from "../utils/userApi";
import EmojiPickerButton from "./EmojiPickerButton";

interface BroadcastMessage {
    id: string;
    from: string;
    content: string;
    timestamp: number;
}

interface BroadcastProps {
    username: string;
    usersById: Record<string, BookRentalUser>;
}

export default function Broadcast({
    username, usersById 
}: BroadcastProps) {
    const [message, setMessage] =
        useState("");

    const queryClient =
        useQueryClient();

    /*
     * Fetch broadcast history using
     * TanStack Query.
     */
    const {
        data: messages = [],
        isLoading,
        isError,
    } = useBroadcastHistory();

    /*
     * Listen for real-time broadcast
     * messages from Socket.IO.
     */
    useEffect(() => {
        const handleMessage = (
            newMessage: BroadcastMessage
        ) => {
            queryClient.setQueryData<
                BroadcastMessage[]
            >(
                ["broadcastMessages"],
                (previousMessages = []) => {
                    /*
                     * Prevent duplicate messages.
                     */
                    const alreadyExists =
                        previousMessages.some(
                            (msg) =>
                                msg.id ===
                                newMessage.id
                        );

                    if (alreadyExists) {
                        return previousMessages;
                    }

                    /*
                     * Add new real-time message
                     * and keep chronological order.
                     */
                    return [
                        ...previousMessages,
                        newMessage,
                    ].sort(
                        (a, b) =>
                            a.timestamp -
                            b.timestamp
                    );
                }
            );
        };

        socket.on(
            "receiveBroadcastMessage",
            handleMessage
        );

        return () => {
            socket.off(
                "receiveBroadcastMessage",
                handleMessage
            );
        };
    }, [queryClient]);

    /*
     * SEND BROADCAST
     */
    const sendMessage = (
        e: FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        const trimmedMessage =
            message.trim();

        if (!trimmedMessage) {
            return;
        }

        if (!socket.connected) {
            showToast(
                "You're offline. Reconnecting...",
                "error"
            );
            return;
        }

        /*
         * Backend will send the message back
         * through receiveBroadcastMessage.
         *
         * Therefore we don't manually add it
         * to the query cache here.
         */
        socket.emit(
            "broadcastMessage",
            trimmedMessage
        );

        setMessage("");
    };

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-900">

            {/* HEADER */}
            <header className="shrink-0 border-b border-slate-800 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-lg sm:h-11 sm:w-11 sm:text-xl">
                        📢
                    </div>

                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-white sm:text-lg">
                            Broadcast
                        </h2>

                        <p className="truncate text-xs text-slate-400 sm:text-sm">
                            Send a message to everyone online
                        </p>
                    </div>

                </div>
            </header>

            {/* MESSAGES */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">

                {/* LOADING */}
                {isLoading && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">

                            <div className="mb-3 text-4xl">
                                📢
                            </div>

                            <p className="text-sm text-slate-400">
                                Loading broadcasts...
                            </p>

                        </div>
                    </div>
                )}

                {/* ERROR */}
                {isError && !isLoading && (
                    <div className="flex h-full items-center justify-center px-4">
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center sm:p-6">

                            <div className="mb-3 text-4xl">
                                ⚠️
                            </div>

                            <h3 className="font-semibold text-red-400">
                                Failed to load broadcasts
                            </h3>

                            <p className="mt-2 text-sm text-slate-400">
                                Please try again later.
                            </p>

                        </div>
                    </div>
                )}

                {/* EMPTY STATE */}
                {!isLoading &&
                    !isError &&
                    messages.length === 0 && (
                        <div className="flex h-full items-center justify-center px-4">

                            <div className="text-center">

                                <div className="mb-4 text-5xl">
                                    📢
                                </div>

                                <h3 className="text-base font-semibold text-slate-300 sm:text-lg">
                                    No broadcasts yet
                                </h3>

                                <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                                    Send a message to everyone online
                                </p>

                            </div>

                        </div>
                    )}

                {/* MESSAGE LIST */}
                {!isLoading &&
                    !isError &&
                    messages.length > 0 && (
                        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4">

                            {messages.map(
                                (msg) => {
                                    const mine =
                                        msg.from ===
                                        username;

                                    return (
                                        <div
                                            key={
                                                msg.id
                                            }
                                            className={`flex w-full ${mine
                                                ? "justify-end"
                                                : "justify-start"
                                                }`}
                                        >

                                            <div
                                                className={`w-fit max-w-[90%] rounded-2xl border p-3 sm:max-w-[75%] sm:p-4 ${mine
                                                    ? "border-orange-500/30 bg-orange-500/10"
                                                    : "border-slate-800 bg-slate-950"
                                                    }`}
                                            >

                                                {/* MESSAGE HEADER */}
                                                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">

                                                    <span
                                                        className={`text-sm font-medium ${mine
                                                            ? "text-orange-400"
                                                            : "text-indigo-400"
                                                            }`}
                                                    >
                                                       {mine ? "You" : `${usersById[msg.from]?.firstName ?? ""} ${usersById[msg.from]?.lastName ?? ""}`.trim() || msg.from}
                                                    </span>

                                                    <span className="text-[10px] text-slate-500 sm:text-xs">
                                                        {new Date(
                                                            msg.timestamp
                                                        ).toLocaleTimeString(
                                                            [],
                                                            {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            }
                                                        )}
                                                    </span>

                                                </div>

                                                {/* MESSAGE CONTENT */}
                                                <p className="mt-2 break-words text-sm leading-6 text-slate-200">
                                                    {
                                                        msg.content
                                                    }
                                                </p>

                                            </div>

                                        </div>
                                    );
                                }
                            )}

                        </div>
                    )}
            </div>

            {/* MESSAGE INPUT */}
            <form
                onSubmit={sendMessage}
                className="shrink-0 border-t border-slate-800 bg-slate-900 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
            >
                <div className="mx-auto flex w-full max-w-4xl items-center gap-2 sm:gap-3">

                    <input
                        value={message}
                        onChange={(e) =>
                            setMessage(
                                e.target.value
                            )
                        }
                        placeholder="Write broadcast message..."
                        className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-orange-500 sm:px-4"
                    />

                    <EmojiPickerButton
                        onEmojiSelect={(emoji) =>
                            setMessage(
                                (previous) =>
                                    previous + emoji
                            )
                        }
                    />

                    <button
                        type="submit"
                        disabled={
                            !socket.connected ||
                            !message.trim()
                        }
                        className="shrink-0 rounded-xl bg-orange-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
                    >
                        <span className="sm:hidden">
                            📢
                        </span>

                        <span className="hidden sm:inline">
                            Broadcast
                        </span>
                    </button>

                </div>
            </form>

        </div>
    );
}