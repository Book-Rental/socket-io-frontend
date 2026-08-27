import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

import { socket } from "../socket";

interface ChatMessage {
    id: string;
    from: string;
    to: string;
    content: string;
    timestamp: number;
}

interface OneToOneProps {
    username: string;
    selectedUser: string | null;
}

export default function OneToOne({
    username,
    selectedUser,
}: OneToOneProps) {

    const [message, setMessage] =
        useState("");

    /*
     * Store ALL private messages received
     * by this user.
     */
    const [messages, setMessages] =
        useState<ChatMessage[]>([]);

    const [typingUser, setTypingUser] =
        useState<string | null>(null);


    /*
     * =====================================================
     * RECEIVE PRIVATE MESSAGES
     * =====================================================
     */
    useEffect(() => {

        const handleMessage = (
            newMessage: ChatMessage
        ) => {

            console.log(
                "FRONTEND PRIVATE MESSAGE RECEIVED:",
                newMessage
            );


            /*
             * IMPORTANT:
             *
             * Do NOT check selectedUser here.
             *
             * Store every private message that belongs
             * to the currently logged-in user.
             */


            const belongsToCurrentUser =
                newMessage.from === username ||
                newMessage.to === username;


            if (!belongsToCurrentUser) {

                console.log(
                    "Ignoring message - not for current user"
                );

                return;
            }


            setMessages(
                (previousMessages) => {

                    /*
                     * Prevent duplicates
                     */
                    const alreadyExists =
                        previousMessages.some(
                            (msg) =>
                                msg.id === newMessage.id
                        );


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


        socket.on(
            "receivePrivateMessage",
            handleMessage
        );


        return () => {

            socket.off(
                "receivePrivateMessage",
                handleMessage
            );

        };

    }, [username]);


    /*
     * =====================================================
     * TYPING
     * =====================================================
     */
    useEffect(() => {

        const handleTyping = (
            userId: string
        ) => {

            if (
                userId === selectedUser
            ) {

                setTypingUser(userId);

            }

        };


        const handleStopTyping = (
            userId: string
        ) => {

            if (
                userId === selectedUser
            ) {

                setTypingUser(null);

            }

        };


        socket.on(
            "typing",
            handleTyping
        );

        socket.on(
            "stopTyping",
            handleStopTyping
        );


        return () => {

            socket.off(
                "typing",
                handleTyping
            );

            socket.off(
                "stopTyping",
                handleStopTyping
            );

        };

    }, [selectedUser]);


    /*
     * =====================================================
     * FILTER MESSAGES FOR CURRENT CONVERSATION
     * =====================================================
     *
     * We filter ONLY for displaying.
     *
     * The messages remain stored in state.
     */
    const currentConversationMessages =
        useMemo(() => {

            if (!selectedUser) {

                return [];

            }


            return messages.filter(
                (msg) => {

                    const isBetweenUsers =
                        (
                            msg.from === username &&
                            msg.to === selectedUser
                        ) ||
                        (
                            msg.from === selectedUser &&
                            msg.to === username
                        );


                    return isBetweenUsers;

                }
            );

        }, [
            messages,
            username,
            selectedUser,
        ]);


    /*
     * =====================================================
     * SEND MESSAGE
     * =====================================================
     */
    const handleSubmit = (
        e: FormEvent
    ) => {

        e.preventDefault();


        const trimmedMessage =
            message.trim();


        if (!selectedUser) {

            console.log(
                "No user selected"
            );

            return;
        }


        if (!trimmedMessage) {

            return;
        }


        if (!socket.connected) {

            console.error(
                "Socket is not connected"
            );

            return;
        }


        console.log(
            "SENDING PRIVATE MESSAGE:",
            {
                from: username,
                to: selectedUser,
                content: trimmedMessage,
            }
        );


        socket.emit(
            "sendPrivateMessage",
            {
                to: selectedUser,
                content: trimmedMessage,
            }
        );


        socket.emit(
            "stopTyping",
            {
                to: selectedUser,
            }
        );


        setMessage("");

    };


    /*
     * =====================================================
     * TYPING
     * =====================================================
     */
    const handleTyping = (
        value: string
    ) => {

        setMessage(value);


        if (!selectedUser) {

            return;
        }


        if (!socket.connected) {

            return;
        }


        if (value.trim()) {

            socket.emit(
                "typing",
                {
                    to: selectedUser,
                }
            );

        } else {

            socket.emit(
                "stopTyping",
                {
                    to: selectedUser,
                }
            );

        }

    };


    /*
     * =====================================================
     * NO USER SELECTED
     * =====================================================
     */
    if (!selectedUser) {

        return (
            <div className="flex h-full flex-1 items-center justify-center bg-slate-900">

                <div className="text-center">

                    <div className="mb-4 text-6xl">
                        👋
                    </div>

                    <h2 className="text-2xl font-bold text-white">
                        Start a conversation
                    </h2>

                    <p className="mt-2 text-slate-400">
                        Select an online user from the sidebar
                    </p>

                </div>

            </div>
        );
    }


    return (
        <div className="flex h-full flex-1 flex-col bg-slate-900">


            {/* =================================================
          HEADER
      ================================================= */}

            <header className="border-b border-slate-800 px-6 py-4">

                <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">

                        {selectedUser
                            .charAt(0)
                            .toUpperCase()}

                    </div>


                    <div>

                        <h2 className="font-semibold text-white">
                            {selectedUser}
                        </h2>

                        <p className="text-xs text-emerald-400">
                            ● Online
                        </p>

                    </div>

                </div>

            </header>


            {/* =================================================
          MESSAGES
      ================================================= */}

            <div className="flex-1 space-y-4 overflow-y-auto p-6">

                {currentConversationMessages.length === 0 && (

                    <div className="flex h-full items-center justify-center">

                        <div className="text-center">

                            <div className="mb-3 text-4xl">
                                💬
                            </div>

                            <p className="text-slate-500">
                                No messages yet
                            </p>

                            <p className="mt-1 text-sm text-slate-600">
                                Start a conversation with {selectedUser}
                            </p>

                        </div>

                    </div>

                )}


                {currentConversationMessages.map(
                    (msg) => {

                        const mine =
                            msg.from === username;


                        return (
                            <div
                                key={msg.id}
                                className={`flex ${mine
                                        ? "justify-end"
                                        : "justify-start"
                                    }`}
                            >

                                <div
                                    className={`max-w-md rounded-2xl px-4 py-3 ${mine
                                            ? "rounded-br-md bg-indigo-600 text-white"
                                            : "rounded-bl-md bg-slate-800 text-slate-100"
                                        }`}
                                >

                                    <p className="text-sm">
                                        {msg.content}
                                    </p>


                                    <p className="mt-1 text-[10px] opacity-60">

                                        {new Date(
                                            msg.timestamp
                                        ).toLocaleTimeString(
                                            [],
                                            {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            }
                                        )}

                                    </p>

                                </div>

                            </div>
                        );

                    }
                )}


                {typingUser && (

                    <div className="text-sm text-slate-500">

                        {typingUser} is typing...

                    </div>

                )}

            </div>


            {/* =================================================
          INPUT
      ================================================= */}

            <form
                onSubmit={handleSubmit}
                className="border-t border-slate-800 p-4"
            >

                <div className="flex gap-3">

                    <input
                        value={message}
                        onChange={(e) =>
                            handleTyping(
                                e.target.value
                            )
                        }
                        placeholder={`Message ${selectedUser}...`}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500"
                    />


                    <button
                        type="submit"
                        disabled={!socket.connected}
                        className="rounded-xl bg-indigo-600 px-6 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Send
                    </button>

                </div>

            </form>

        </div>
    );
}