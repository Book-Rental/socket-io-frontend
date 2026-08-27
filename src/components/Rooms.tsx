import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import { socket } from "../socket";
import { Message } from "../utils/types";


interface RoomsProps {
    username: string;
}


export default function Rooms({
    username,
}: RoomsProps) {

    const [roomId, setRoomId] =
        useState("");

    const [activeRoom, setActiveRoom] =
        useState<string | null>(null);

    const [message, setMessage] =
        useState("");

    const [messages, setMessages] =
        useState<Message[]>([]);

    const [roomUsers, setRoomUsers] =
        useState<string[]>([]);

    const [notification, setNotification] =
        useState("");

    const [error, setError] =
        useState("");


    /*
     * =====================================================
     * SOCKET LISTENERS
     * =====================================================
     */

    useEffect(() => {

        /*
         * ROOM CREATED
         */

        const handleRoomCreated = (
            createdRoomId: string
        ) => {

            console.log(
                "ROOM CREATED:",
                createdRoomId
            );

            setActiveRoom(
                createdRoomId
            );

            setMessages([]);

            setRoomUsers([]);

            setError("");

            setNotification(
                `Room "${createdRoomId}" created`
            );
        };


        /*
         * ROOM JOINED
         */

        const handleRoomJoined = (
            joinedRoomId: string
        ) => {

            console.log(
                "ROOM JOINED:",
                joinedRoomId
            );

            setActiveRoom(
                joinedRoomId
            );

            setMessages([]);

            setRoomUsers([]);

            setError("");

            setNotification(
                `Joined room "${joinedRoomId}"`
            );
        };


        /*
         * ROOM LEFT
         */

        const handleRoomLeft = (
            leftRoomId: string
        ) => {

            console.log(
                "ROOM LEFT:",
                leftRoomId
            );

            setActiveRoom(
                null
            );

            setMessages([]);

            setRoomUsers([]);

            setNotification(
                `Left room "${leftRoomId}"`
            );
        };


        /*
         * ROOM MESSAGE
         */

        const handleRoomMessage = (
            msg: Message
        ) => {

            console.log(
                "ROOM MESSAGE:",
                msg
            );


            /*
             * Only display messages
             * for current room.
             */

            if (
                msg.roomId !== activeRoom
            ) {

                return;
            }


            setMessages(
                (previousMessages) => [
                    ...previousMessages,
                    msg,
                ]
            );
        };


        /*
         * ROOM USERS
         */

        const handleRoomUsers = (
            data: {
                roomId: string;
                users: string[];
            }
        ) => {

            console.log(
                "ROOM USERS:",
                data
            );


            if (
                data.roomId !== activeRoom
            ) {

                return;
            }


            setRoomUsers(
                data.users
            );
        };


        /*
         * ROOM NOTIFICATION
         */

        const handleRoomNotification = (
            message: string
        ) => {

            console.log(
                "ROOM NOTIFICATION:",
                message
            );

            setNotification(
                message
            );
        };


        /*
         * ERROR
         */

        const handleError = (
            message: string
        ) => {

            console.error(
                "ROOM ERROR:",
                message
            );

            setError(
                message
            );
        };


        socket.on(
            "roomCreated",
            handleRoomCreated
        );

        socket.on(
            "roomJoined",
            handleRoomJoined
        );

        socket.on(
            "roomLeft",
            handleRoomLeft
        );

        socket.on(
            "receiveRoomMessage",
            handleRoomMessage
        );

        socket.on(
            "roomUsers",
            handleRoomUsers
        );

        socket.on(
            "roomNotification",
            handleRoomNotification
        );

        socket.on(
            "errorMessage",
            handleError
        );


        /*
         * Cleanup
         */

        return () => {

            socket.off(
                "roomCreated",
                handleRoomCreated
            );

            socket.off(
                "roomJoined",
                handleRoomJoined
            );

            socket.off(
                "roomLeft",
                handleRoomLeft
            );

            socket.off(
                "receiveRoomMessage",
                handleRoomMessage
            );

            socket.off(
                "roomUsers",
                handleRoomUsers
            );

            socket.off(
                "roomNotification",
                handleRoomNotification
            );

            socket.off(
                "errorMessage",
                handleError
            );
        };

    }, [activeRoom]);


    /*
     * =====================================================
     * CREATE ROOM
     * =====================================================
     */

    const createRoom = () => {

        const trimmedRoomId =
            roomId.trim();


        if (!trimmedRoomId) {

            setError(
                "Room name is required"
            );

            return;
        }


        setError("");

        setNotification("");


        /*
         * IMPORTANT:
         *
         * Do NOT set activeRoom here.
         *
         * Server will send roomCreated
         * only when creation succeeds.
         */

        socket.emit(
            "createRoom",
            trimmedRoomId
        );
    };


    /*
     * =====================================================
     * JOIN ROOM
     * =====================================================
     */

    const joinRoom = () => {

        const trimmedRoomId =
            roomId.trim();


        if (!trimmedRoomId) {

            setError(
                "Room name is required"
            );

            return;
        }


        setError("");

        setNotification("");


        /*
         * Do NOT set activeRoom here.
         *
         * Server will send roomJoined
         * only when joining succeeds.
         */

        socket.emit(
            "joinRoom",
            trimmedRoomId
        );
    };


    /*
     * =====================================================
     * LEAVE ROOM
     * =====================================================
     */

    const leaveRoom = () => {

        if (!activeRoom) {
            return;
        }


        socket.emit(
            "leaveRoom",
            activeRoom
        );
    };


    /*
     * =====================================================
     * SEND MESSAGE
     * =====================================================
     */

    const sendMessage = (
        e: FormEvent<HTMLFormElement>
    ) => {

        e.preventDefault();


        const trimmedMessage =
            message.trim();


        if (
            !activeRoom ||
            !trimmedMessage
        ) {

            return;
        }


        socket.emit(
            "sendRoomMessage",
            {
                roomId: activeRoom,

                content:
                    trimmedMessage,
            }
        );


        setMessage("");
    };


    return (

        <div className="flex h-full flex-1 bg-slate-900">


            {/* =================================================
                ROOM SIDEBAR
            ================================================= */}

            <div className="w-72 shrink-0 border-r border-slate-800 bg-slate-950 p-5">


                <h2 className="text-lg font-semibold text-white">
                    Rooms
                </h2>


                <p className="mt-1 text-sm text-slate-500">
                    Create or join a room
                </p>


                {/* ROOM INPUT */}

                <input
                    value={roomId}
                    onChange={(e) =>
                        setRoomId(
                            e.target.value
                        )
                    }
                    onKeyDown={(e) => {

                        if (
                            e.key === "Enter"
                        ) {

                            joinRoom();

                        }

                    }}
                    placeholder="Enter room name"
                    className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-indigo-500"
                />


                {/* CREATE */}

                <button
                    type="button"
                    onClick={createRoom}
                    className="mt-3 w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-500"
                >
                    Create Room
                </button>


                {/* JOIN */}

                <button
                    type="button"
                    onClick={joinRoom}
                    className="mt-2 w-full rounded-xl border border-slate-700 py-3 font-medium text-slate-300 transition hover:bg-slate-800"
                >
                    Join Room
                </button>


                {/* ERROR */}

                {error && (

                    <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">

                        <p className="text-sm text-red-400">
                            {error}
                        </p>

                    </div>

                )}


                {/* NOTIFICATION */}

                {notification && (

                    <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">

                        <p className="text-sm text-indigo-300">
                            {notification}
                        </p>

                    </div>

                )}


                {/* ACTIVE ROOM */}

                {activeRoom && (

                    <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-4">


                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Current Room
                        </p>


                        <p className="mt-2 font-semibold text-white">
                            #{activeRoom}
                        </p>


                        <div className="mt-5">

                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Members
                            </p>


                            <div className="mt-3 space-y-2">

                                {roomUsers.length === 0 && (

                                    <p className="text-sm text-slate-500">
                                        No members
                                    </p>

                                )}


                                {roomUsers.map(
                                    (user) => (

                                        <div
                                            key={user}
                                            className="flex items-center gap-2 text-sm text-slate-300"
                                        >

                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />

                                            <span>
                                                {user === username
                                                    ? `${user} (You)`
                                                    : user}
                                            </span>

                                        </div>

                                    )
                                )}

                            </div>

                        </div>


                        {/* LEAVE */}

                        <button
                            type="button"
                            onClick={leaveRoom}
                            className="mt-5 w-full rounded-lg bg-red-500/10 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
                        >
                            Leave Room
                        </button>

                    </div>

                )}

            </div>


            {/* =================================================
                CHAT AREA
            ================================================= */}

            <div className="flex min-w-0 flex-1 flex-col">


                {!activeRoom ? (

                    /*
                     * NO ROOM
                     */

                    <div className="flex flex-1 items-center justify-center">

                        <div className="text-center">

                            <div className="text-6xl">
                                🏠
                            </div>


                            <h2 className="mt-4 text-2xl font-bold text-white">
                                Join a room
                            </h2>


                            <p className="mt-2 text-slate-400">
                                Create a new room or join an existing room
                            </p>

                        </div>

                    </div>

                ) : (

                    /*
                     * ROOM CHAT
                     */

                    <>


                        {/* HEADER */}

                        <header className="border-b border-slate-800 bg-slate-950 px-6 py-5">

                            <div className="flex items-center justify-between">

                                <div>

                                    <h2 className="font-semibold text-white">
                                        #{activeRoom}
                                    </h2>


                                    <p className="mt-1 text-sm text-slate-400">

                                        {roomUsers.length}

                                        {" "}

                                        member
                                        {roomUsers.length !== 1
                                            ? "s"
                                            : ""}

                                    </p>

                                </div>


                                <div className="flex items-center gap-2">

                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />

                                    <span className="text-sm text-emerald-400">
                                        Active
                                    </span>

                                </div>

                            </div>

                        </header>


                        {/* MESSAGES */}

                        <div className="flex-1 space-y-4 overflow-y-auto p-6">


                            {messages.length === 0 && (

                                <div className="flex h-full items-center justify-center">

                                    <div className="text-center">

                                        <div className="text-5xl">
                                            💬
                                        </div>

                                        <p className="mt-3 text-slate-400">
                                            No messages yet
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Start the conversation
                                        </p>

                                    </div>

                                </div>

                            )}


                            {messages.map(
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
                                                        ? "bg-indigo-600 text-white"
                                                        : "bg-slate-800 text-slate-200"
                                                    }`}
                                            >

                                                <p className="text-xs font-semibold opacity-70">
                                                    {mine
                                                        ? "You"
                                                        : msg.from}
                                                </p>


                                                <p className="mt-1 break-words">
                                                    {msg.content}
                                                </p>


                                                <p className="mt-2 text-[10px] opacity-50">

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

                        </div>


                        {/* INPUT */}

                        <form
                            onSubmit={sendMessage}
                            className="border-t border-slate-800 bg-slate-950 p-4"
                        >

                            <div className="flex gap-3">

                                <input
                                    value={message}
                                    onChange={(e) =>
                                        setMessage(
                                            e.target.value
                                        )
                                    }
                                    placeholder={`Message #${activeRoom}`}
                                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-indigo-500"
                                />


                                <button
                                    type="submit"
                                    disabled={
                                        !message.trim()
                                    }
                                    className="rounded-xl bg-indigo-600 px-6 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Send
                                </button>

                            </div>

                        </form>

                    </>

                )}

            </div>

        </div>

    );
}