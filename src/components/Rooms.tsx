import { FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../socket";
import { Message } from "../utils/types";
import { useRoomHistory } from "../hooks/queries/useRoomHistory";
import { showToast } from "../utils/showToaster";
import { BookRentalUser } from "../utils/userApi";
import EmojiPickerButton from "./EmojiPickerButton";

interface RoomsProps {
    username: string;
    usersById: Record<string, BookRentalUser>;
}

export default function Rooms({ username, usersById }: RoomsProps) {
    const [roomId, setRoomId] = useState("");
    const [activeRoom, setActiveRoom] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [roomUsers, setRoomUsers] = useState<string[]>([]);
    const [joinedRooms, setJoinedRooms] = useState<string[]>([]);

    const queryClient = useQueryClient();

    const {
        data: messages = [],
        isLoading,
        isError,
    } = useRoomHistory(activeRoom);

    useEffect(() => {
        const handleRoomCreated = (createdRoomId: string) => {
            setActiveRoom(createdRoomId);
            setJoinedRooms((prev) =>
                prev.includes(createdRoomId) ? prev : [...prev, createdRoomId]
            );
            setRoomUsers([]);
            showToast(`Room "${createdRoomId}" created`, "success");
        };

        const handleRoomJoined = (joinedRoomId: string) => {
            setActiveRoom(joinedRoomId);
            setJoinedRooms((prev) =>
                prev.includes(joinedRoomId) ? prev : [...prev, joinedRoomId]
            );
            setRoomUsers([]);
            showToast(`Joined room "${joinedRoomId}"`, "success");
        };

        const handleRoomLeft = (leftRoomId: string) => {
            queryClient.removeQueries({ queryKey: ["roomMessages", leftRoomId] });
            setActiveRoom(null);
            setRoomUsers([]);
            showToast(`Left room "${leftRoomId}"`, "custom");
        };

        const handleRoomMessage = (newMessage: Message) => {
            if (newMessage.roomId !== activeRoom) return;

            queryClient.setQueryData<Message[]>(
                ["roomMessages", activeRoom],
                (previousMessages = []) => {
                    const alreadyExists = previousMessages.some(
                        (msg) => msg.id === newMessage.id
                    );
                    if (alreadyExists) return previousMessages;
                    return [...previousMessages, newMessage].sort(
                        (a, b) => a.timestamp - b.timestamp
                    );
                }
            );
        };

        const handleRoomUsers = (data: { roomId: string; users: string[] }) => {
            if (data.roomId !== activeRoom) return;
            setRoomUsers(data.users);
        };

        const handleRoomNotification = (message: string) => {
            showToast(message, "custom");
        };

        const handleError = (message: string) => {
            showToast(message, "error");
        };

        const handleMyRooms = (roomIds: string[]) => {
            setJoinedRooms(roomIds);
        };

        const handleConnect = () => {
            socket.emit("getMyRooms");
        };

        socket.on("roomCreated", handleRoomCreated);
        socket.on("roomJoined", handleRoomJoined);
        socket.on("roomLeft", handleRoomLeft);
        socket.on("receiveRoomMessage", handleRoomMessage);
        socket.on("roomUsers", handleRoomUsers);
        socket.on("roomNotification", handleRoomNotification);
        socket.on("errorMessage", handleError);
        socket.on("myRooms", handleMyRooms);
        socket.on("connect", handleConnect);

        // ask immediately too, in case we're already connected when this mounts
        if (socket.connected) {
            socket.emit("getMyRooms");
        }

        return () => {
            socket.off("roomCreated", handleRoomCreated);
            socket.off("roomJoined", handleRoomJoined);
            socket.off("roomLeft", handleRoomLeft);
            socket.off("receiveRoomMessage", handleRoomMessage);
            socket.off("roomUsers", handleRoomUsers);
            socket.off("roomNotification", handleRoomNotification);
            socket.off("errorMessage", handleError);
            socket.off("myRooms", handleMyRooms);
            socket.off("connect", handleConnect);
        };
    }, [activeRoom, queryClient]);

    const createRoom = () => {
        const trimmedRoomId = roomId.trim();

        if (!trimmedRoomId) {
            showToast("Room name is required", "error");
            return;
        }

        socket.emit("createRoom", trimmedRoomId);
        setRoomId("");
    };

    const joinRoom = () => {
        const trimmedRoomId = roomId.trim();

        if (!trimmedRoomId) {
            showToast("Room name is required", "error");
            return;
        }

        socket.emit("joinRoom", trimmedRoomId);
        setRoomId("");
    };

    const leaveRoom = () => {
        if (!activeRoom) {
            return;
        }

        socket.emit("leaveRoom", activeRoom);
    };

    const selectRoom = (room: string) => {
        if (room === activeRoom) {
            return;
        }

        setActiveRoom(room);
        setRoomUsers([]);
    };

    const sendMessage = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const trimmedMessage = message.trim();

        if (!activeRoom || !trimmedMessage) {
            return;
        }

        if (!socket.connected) {
            showToast("You're offline. Reconnecting...", "error");
            return;
        }

        socket.emit("sendRoomMessage", {
            roomId: activeRoom,
            content: trimmedMessage,
        });

        setMessage("");
    };

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-900 lg:flex-row">
            <aside className="shrink-0 border-b border-slate-800 bg-slate-950 lg:w-72 lg:border-b-0 lg:border-r">
                <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-lg">
                            🏠
                        </div>

                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-white sm:text-lg">
                                Rooms
                            </h2>
                            <p className="text-xs text-slate-500 sm:text-sm">
                                Create or join a room
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                        <input
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    joinRoom();
                                }
                            }}
                            placeholder="Enter room name"
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-500"
                        />

                        <div className="flex gap-2 sm:flex-col">
                            <button
                                type="button"
                                onClick={createRoom}
                                className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
                            >
                                Create Room
                            </button>

                            <button
                                type="button"
                                onClick={joinRoom}
                                className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                            >
                                Join Room
                            </button>
                        </div>
                    </div>

                    {joinedRooms.length > 0 && (
                        <div className="mt-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Your Rooms
                            </p>

                            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:flex-col">
                                {joinedRooms.map((room) => (
                                    <button
                                        key={room}
                                        type="button"
                                        onClick={() => selectRoom(room)}
                                        className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm transition lg:w-full ${activeRoom === room
                                            ? "bg-indigo-600 text-white"
                                            : "text-slate-300 hover:bg-slate-800"
                                            }`}
                                    >
                                        #{room}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeRoom && (
                        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4 lg:mt-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Current Room
                                    </p>
                                    <p className="mt-1 font-semibold text-white">
                                        #{activeRoom}
                                    </p>
                                </div>

                                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Active
                                </span>
                            </div>

                            <div className="mt-5">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Members
                                </p>

                                <div className="mt-3 max-h-32 space-y-2 overflow-y-auto lg:max-h-48">
                                    {roomUsers.length === 0 ? (
                                        <p className="text-sm text-slate-500">
                                            No members
                                        </p>
                                    ) : (
                                        roomUsers.map((user) => (
                                            <div
                                                key={user}
                                                className="flex items-center gap-2 text-sm text-slate-300"
                                            >
                                                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                                                <span className="truncate">
                                                    {user === username
                                                        ? `${usersById[user]?.firstName ?? user} (You)`
                                                        : `${usersById[user]?.firstName ?? ""} ${usersById[user]?.lastName ?? ""}`.trim() || user}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

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
            </aside>

            <section className="flex min-h-0 min-w-0 flex-1 flex-col">
                {!activeRoom ? (
                    <div className="flex flex-1 items-center justify-center px-4">
                        <div className="text-center">
                            <div className="text-5xl sm:text-6xl">
                                🏠
                            </div>

                            <h2 className="mt-4 text-xl font-bold text-white sm:text-2xl">
                                Join a room
                            </h2>

                            <p className="mt-2 max-w-md text-sm text-slate-400">
                                Create a new room or join an existing room
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <header className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-4 sm:px-6 sm:py-5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="truncate font-semibold text-white sm:text-lg">
                                        #{activeRoom}
                                    </h2>

                                    <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                                        {roomUsers.length}{" "}
                                        member
                                        {roomUsers.length !== 1
                                            ? "s"
                                            : ""}
                                    </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="hidden text-sm text-emerald-400 sm:inline">
                                        Active
                                    </span>
                                </div>
                            </div>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
                            {isLoading && (
                                <div className="flex h-full items-center justify-center">
                                    <div className="text-center">
                                        <div className="mb-3 text-4xl">
                                            💬
                                        </div>

                                        <p className="text-sm text-slate-400">
                                            Loading messages...
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isError && !isLoading && (
                                <div className="flex h-full items-center justify-center px-4">
                                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center sm:p-6">
                                        <div className="mb-3 text-4xl">
                                            ⚠️
                                        </div>

                                        <h3 className="font-semibold text-red-400">
                                            Failed to load messages
                                        </h3>

                                        <p className="mt-2 text-sm text-slate-400">
                                            Please try again later.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!isLoading &&
                                !isError &&
                                messages.length === 0 && (
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

                            {!isLoading &&
                                !isError &&
                                messages.length > 0 && (
                                    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4">
                                        {messages.map((msg) => {
                                            const mine =
                                                msg.from === username;

                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex w-full ${mine
                                                        ? "justify-end"
                                                        : "justify-start"
                                                        }`}
                                                >
                                                    <div
                                                        className={`w-fit max-w-[90%] rounded-2xl px-3 py-3 sm:max-w-[75%] sm:px-4 ${mine
                                                            ? "bg-indigo-600 text-white"
                                                            : "bg-slate-800 text-slate-200"
                                                            }`}
                                                    >
                                                        <p className="text-xs font-semibold opacity-70">
                                                            {mine ? "You" : `${usersById[msg.from]?.firstName ?? ""} ${usersById[msg.from]?.lastName ?? ""}`.trim() || msg.from}
                                                        </p>

                                                        <p className="mt-1 break-words text-sm leading-6">
                                                            {msg.content}
                                                        </p>

                                                        <p className="mt-1 text-[10px] opacity-50 sm:text-xs">
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
                                        })}
                                    </div>
                                )}
                        </div>

                        <form
                            onSubmit={sendMessage}
                            className="shrink-0 border-t border-slate-800 bg-slate-950 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
                        >
                            <div className="mx-auto flex w-full max-w-4xl items-center gap-2 sm:gap-33">
                                <input
                                    value={message}
                                    onChange={(e) =>
                                        setMessage(e.target.value)
                                    }
                                    placeholder={`Message #${activeRoom}`}
                                    className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-500 sm:px-4"
                                />

                                <EmojiPickerButton
                                    onEmojiSelect={(emoji) =>
                                        setMessage((previous) => previous + emoji)
                                    }
                                />

                                <button
                                    type="submit"
                                    disabled={
                                        !message.trim() ||
                                        !socket.connected
                                    }
                                    className="shrink-0 rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
                                >
                                    <span className="sm:hidden">
                                        ➤
                                    </span>
                                    <span className="hidden sm:inline">
                                        Send
                                    </span>
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </section>
        </div>
    );
}