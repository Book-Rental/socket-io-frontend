import { FormEvent, useEffect, useState,} from "react";
import { socket } from "../socket";
import { fetchBroadcastHistory } from "../utils/chatApi";
interface BroadcastMessage {
    id: string;
    from: string;
    content: string;
    timestamp: number;
}

interface BroadcastProps {
    username: string;
}

export default function Broadcast({ username,}: BroadcastProps) {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<BroadcastMessage[]>([]);

    useEffect(() => {
        const handleMessage = ( newMessage: BroadcastMessage ) => {
            console.log("BROADCAST RECEIVED:", newMessage );

            setMessages(
                (previousMessages) => {
                    const alreadyExists = previousMessages.some( (msg) => msg.id === newMessage.id);
                    if (alreadyExists) {
                        return previousMessages;
                    }

                    return [
                        ...previousMessages,
                        newMessage,
                    ];
                }
            );
        };

        socket.on( "receiveBroadcastMessage", handleMessage );

        return () => {
            socket.off( "receiveBroadcastMessage", handleMessage );
        };
    }, []);

    useEffect(() => {
        fetchBroadcastHistory().then((history) => {
            setMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const merged = [...prev, ...history.filter((m) => !existingIds.has(m.id))];
                return merged.sort((a, b) => a.timestamp - b.timestamp);
            });
        });
    }, []);

    const sendMessage = ( e: FormEvent<HTMLFormElement> ) => {
        e.preventDefault();
        const trimmedMessage = message.trim();

        if (!trimmedMessage) {
            return;
        }

        if (!socket.connected) {
            console.error( "Socket is not connected" );
            return;
        }

        console.log(
            "SENDING BROADCAST:",
            {
                from: username,
                content: trimmedMessage,
            }
        );

        socket.emit( "broadcastMessage", trimmedMessage );
        setMessages((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                from: username,
                content: trimmedMessage,
                timestamp: Date.now(),
            },
        ]);
    };


    return (
        <div className="flex h-full flex-1 flex-col bg-slate-900">
            <header className="border-b border-slate-800 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/20 text-xl">
                        📢
                    </div>
                    <div>
                        <h2 className="font-semibold text-white">
                            Broadcast
                        </h2>
                        <p className="text-sm text-slate-400">
                            Send a message to everyone online
                        </p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                {messages.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <div className="mb-4 text-5xl">
                                📢
                            </div>
                            <h3 className="text-lg font-semibold text-slate-300">
                                No broadcasts yet
                            </h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Send a message to everyone online
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {messages.map(
                        (msg) => {
                            const mine = msg.from === username;
                            return (
                                <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start" }`} >
                                    <div
                                        className={`max-w-lg rounded-2xl border p-4 ${mine
                                                ? "border-orange-500/30 bg-orange-500/10"
                                                : "border-slate-800 bg-slate-950"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-6">
                                            <span
                                                className={`font-medium ${mine
                                                        ? "text-orange-400"
                                                        : "text-indigo-400"
                                                    }`}
                                            >
                                                {mine ? "You" : msg.from}
                                            </span>
                                            <span className="text-xs text-slate-500">
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
                                        <p className="mt-2 text-sm text-slate-200">
                                            {msg.content}
                                        </p>
                                    </div>
                                </div>
                            );
                        }
                    )}
                </div>
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
                        placeholder="Write broadcast message..."
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-orange-500"
                    />

                    <button
                        type="submit"
                        disabled={
                            !socket.connected ||
                            !message.trim()
                        }
                        className="rounded-xl bg-orange-600 px-6 font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Broadcast
                    </button>
                </div>
            </form>
        </div>
    );
}