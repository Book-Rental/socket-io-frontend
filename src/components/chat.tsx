import { useEffect, useState } from "react";
import socket from "../socket";

interface Message {
    userId: string;
    message: string;
    timestamp: string;
}

const Chat = () => {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        socket.on("receiveMessage", (data: Message) => {
            setMessages((previousMessages) => [
                ...previousMessages,
                data,
            ]);
        });

        return () => {
            socket.off("receiveMessage");
        };
    }, []);

    const sendMessage = () => {
        if (!message.trim()) {
            return;
        }

        socket.emit("sendMessage", message);

        setMessage("");
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="mx-auto flex max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-lg">

                {/* Header */}
                <div className="bg-blue-600 px-6 py-4 text-white">
                    <h1 className="text-xl font-semibold">
                        Socket.IO Chat
                    </h1>

                    <p className="text-sm text-blue-100">
                        Real-time messaging
                    </p>
                </div>

                {/* Messages */}
                <div className="h-[500px] space-y-4 overflow-y-auto p-6">

                    {messages.length === 0 ? (
                        <p className="text-center text-gray-400">
                            No messages yet
                        </p>
                    ) : (
                        messages.map((item, index) => (
                            <div
                                key={index}
                                className="rounded-lg bg-gray-100 p-4"
                            >
                                <p className="text-xs text-gray-500">
                                    {item.userId}
                                </p>

                                <p className="mt-1 text-gray-800">
                                    {item.message}
                                </p>
                            </div>
                        ))
                    )}

                </div>

                {/* Input */}
                <div className="flex gap-3 border-t p-4">

                    <input
                        type="text"
                        value={message}
                        onChange={(event) =>
                            setMessage(event.target.value)
                        }
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                sendMessage();
                            }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500"
                    />

                    <button
                        onClick={sendMessage}
                        className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
                    >
                        Send
                    </button>

                </div>

            </div>
        </div>
    );
};

export default Chat;