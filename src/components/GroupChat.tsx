import { FormEvent, useEffect, useState } from "react";
import { socket } from "../socket";
import { Message } from "../utils/types";
import { fetchGroupHistory } from "../utils/chatApi";
interface GroupChatProps {
    username: string;
    onlineUsers: string[];
}

export default function GroupChat({ username, onlineUsers,}: GroupChatProps) {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])

    useEffect(() => {
        const handleBroadcastMessage = ( msg: Message ) => {
            setMessages((prev) => [
                ...prev,
                msg,
            ]);
        };

        socket.on( "receiveGroupMessage", handleBroadcastMessage );
        return () => {
            socket.off( "receiveBroadcastMessage", handleBroadcastMessage );
        };
    }, []);

    

    const sendMessage = ( e: FormEvent ) => {
        e.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage) {
            return;
        }
        socket.emit(
            "sendGroupMessage",
            {
                recipients: selectedRecipients,
                content: trimmedMessage,
            }
        );
        setMessage("");
    };

    return (
        <div className="flex h-full flex-1 bg-slate-900">
            <div className="w-72 shrink-0 border-r border-slate-800 p-5">
                <h2 className="text-lg font-semibold text-white">
                    Broadcast
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Message all online users
                </p>
                <div className="mt-5 space-y-2">
                    {onlineUsers
                        .filter( (user) => user !== username )
                        .map((user) => (
                            <div
                                key={user}
                                className="flex items-center gap-3 rounded-xl bg-slate-800 px-3 py-3"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
                                    {user
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-300">
                                        {user}
                                    </p>
                                    <p className="text-xs text-emerald-400">
                                        Online
                                    </p>
                                </div>
                            </div>
                        ))}
                </div>
                <div className="mt-5 rounded-xl bg-slate-800 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                        Online Users
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">
                        {onlineUsers.length}
                    </p>
                </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="border-b border-slate-800 px-6 py-5">
                    <h2 className="font-semibold text-white">
                        Broadcast Message
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                        Messages are sent to everyone online
                    </p>
                </header>
                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                    {messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                                <div className="text-5xl">
                                    📢
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-white">
                                    Broadcast Messaging
                                </h3>
                                <p className="mt-2 text-sm text-slate-400">
                                    Send a message to everyone online
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const mine = msg.from === username;
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${mine ? "justify-end" : "justify-start" }`}
                                >
                                    <div
                                        className={`max-w-md rounded-2xl px-4 py-3 ${mine
                                                ? "bg-indigo-600 text-white"
                                                : "bg-slate-800 text-slate-200"
                                            }`}
                                    >
                                        <p className="text-xs font-semibold opacity-70">
                                            {mine
                                                ? "You"
                                                : msg.from}
                                        </p>
                                        <p className="mt-1">
                                            {msg.content}
                                        </p>
                                        <p className="mt-1 text-[10px] opacity-50">

                                            {new Date(
                                                msg.timestamp
                                            ).toLocaleTimeString()}

                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <form onSubmit={sendMessage} className="border-t border-slate-800 p-4" >
                    <div className="flex gap-3">
                        <input
                            value={message}
                            onChange={(e) =>
                                setMessage(
                                    e.target.value
                                )
                            }
                            placeholder="Type a broadcast message..."
                            className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-indigo-500"
                        />

                        <button
                            type="submit"
                            disabled={!message.trim()}
                            className="rounded-xl bg-indigo-600 px-6 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Broadcast
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}