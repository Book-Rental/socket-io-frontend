import { useEffect, useState } from "react";
import socket from "../socket";

interface RoomMessage {
    userId: string;
    message: string;
    timestamp: string;
}

interface BroadcastMessage {
    userId: string;
    message: string;
    timestamp: string;
}

interface PrivateMessage {
    fromUserId: string;
    message: string;
    timestamp: string;
    outgoing?: boolean; // to style "sent by me" differently
}

type Tab = "broadcast" | "room" | "private";

const Chat = () => {
    const [tab, setTab] = useState<Tab>("broadcast");
    const [connected, setConnected] = useState(socket.connected);

    // ---- identity (stand-in for login) ----
    const [myUserId, setMyUserId] = useState("");
    const [registered, setRegistered] = useState(false);

    // ---- broadcast state ----
    const [broadcastInput, setBroadcastInput] = useState("");
    const [broadcastMessages, setBroadcastMessages] = useState<BroadcastMessage[]>([]);

    // ---- room state ----
    const [roomId, setRoomId] = useState("room1");
    const [joined, setJoined] = useState(false);
    const [joining, setJoining] = useState(false);
    const [roomInput, setRoomInput] = useState("");
    const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);

    // ---- private state ----
    const [targetUserId, setTargetUserId] = useState("");
    const [privateInput, setPrivateInput] = useState("");
    const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
    const [privateError, setPrivateError] = useState("");

    useEffect(() => {
        const onConnect = () => setConnected(true);
        const onDisconnect = () => {
            setConnected(false);
            setJoined(false);
            setRegistered(false);
        };

        const onReceiveMessage = (data: BroadcastMessage) => {
            setBroadcastMessages((prev) => [...prev, data]);
        };

        const onRoomJoined = () => {
            setJoined(true);
            setJoining(false);
        };
        const onReceiveRoomMessage = (data: RoomMessage) => {
            setRoomMessages((prev) => [...prev, data]);
        };

        const onReceivePrivateMessage = (data: PrivateMessage) => {
            setPrivateMessages((prev) => [...prev, { ...data, outgoing: false }]);
        };
        const onPrivateMessageError = (data: { toUserId: string; reason: string }) => {
            setPrivateError(`Could not reach "${data.toUserId}": ${data.reason}`);
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("receiveMessage", onReceiveMessage);
        socket.on("roomJoined", onRoomJoined);
        socket.on("receiveRoomMessage", onReceiveRoomMessage);
        socket.on("receivePrivateMessage", onReceivePrivateMessage);
        socket.on("privateMessageError", onPrivateMessageError);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("receiveMessage", onReceiveMessage);
            socket.off("roomJoined", onRoomJoined);
            socket.off("receiveRoomMessage", onReceiveRoomMessage);
            socket.off("receivePrivateMessage", onReceivePrivateMessage);
            socket.off("privateMessageError", onPrivateMessageError);
        };
    }, []);

    // ---- actions ----
    const registerIdentity = () => {
        if (!myUserId.trim()) return;
        socket.emit("registerUser", myUserId.trim());
        setRegistered(true);
    };

    const sendBroadcast = () => {
        if (!broadcastInput.trim()) return;
        const myMessage = {
            userId: socket.id ?? "me",
            message: broadcastInput,
            timestamp: new Date().toISOString(),
        };
        socket.emit("sendMessage", broadcastInput);
        setBroadcastMessages((prev) => [...prev, myMessage]);  
        setBroadcastInput("");
    };

    const joinRoom = () => {
        if (!roomId.trim()) return;
        setJoining(true);
        socket.emit("joinRoom", roomId);
    };

    const sendRoomMsg = () => {
        if (!roomInput.trim() || !joined) return;
        socket.emit("sendRoomMessage", { roomId, message: roomInput });
        setRoomInput("");
    };

    const sendPrivate = () => {
        if (!privateInput.trim() || !targetUserId.trim() || !registered) return;
        setPrivateError("");
        socket.emit("privateMessage", {
            toUserId: targetUserId.trim(),
            fromUserId: myUserId,
            message: privateInput,
        });
        // show it in our own window immediately since server won't echo it back to sender
        setPrivateMessages((prev) => [
            ...prev,
            { fromUserId: myUserId, message: privateInput, timestamp: new Date().toISOString(), outgoing: true },
        ]);
        setPrivateInput("");
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="mx-auto max-w-3xl overflow-hidden rounded-lg bg-white shadow">

                {/* Header */}
                <div className="bg-blue-600 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-semibold">Socket.IO Chat Demo</h1>
                        <span className="text-sm">
                            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
                            {connected ? "Connected" : "Disconnected"}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-blue-100">Socket ID: {socket.id || "not connected"}</p>
                </div>

                {/* Identity bar - stand-in for login, needed for private messages */}
                <div className="border-b bg-yellow-50 p-4">
                    <p className="mb-2 text-xs text-gray-600">
                        No login page yet — set a temporary user ID (used for private messages only)
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={myUserId}
                            onChange={(e) => setMyUserId(e.target.value)}
                            placeholder="e.g. alice"
                            disabled={registered}
                            className="flex-1 rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 disabled:bg-gray-100"
                        />
                        <button
                            onClick={registerIdentity}
                            disabled={registered || !connected}
                            className="rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-400"
                        >
                            {registered ? `Registered as ${myUserId}` : "Register"}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    {(["broadcast", "room", "private"] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-3 text-sm font-medium capitalize ${
                                tab === t ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"
                            }`}
                        >
                            {t === "room" ? "Room (1-to-many)" : t === "private" ? "Private (1-to-1)" : "Broadcast (all)"}
                        </button>
                    ))}
                </div>

                {/* ---------------- BROADCAST TAB ---------------- */}
                {tab === "broadcast" && (
                    <div>
                        <div className="h-[380px] overflow-y-auto bg-gray-50 p-6">
                            {broadcastMessages.length === 0 ? (
                                <p className="text-center text-gray-400">No messages yet — sent to EVERY connected client</p>
                            ) : (
                                <div className="space-y-3">
                                    {broadcastMessages.map((m, i) => (
                                        <div key={i} className="rounded-lg bg-white p-4 shadow-sm">
                                            <p className="text-xs text-gray-400">{m.userId}</p>
                                            <p className="mt-1 text-gray-800">{m.message}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 border-t bg-white p-6">
                            <input
                                type="text"
                                value={broadcastInput}
                                onChange={(e) => setBroadcastInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendBroadcast()}
                                placeholder="Message to everyone..."
                                className="flex-1 rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                            />
                            <button onClick={sendBroadcast} className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700">
                                Send to All
                            </button>
                        </div>
                    </div>
                )}

                {/* ---------------- ROOM TAB ---------------- */}
                {tab === "room" && (
                    <div>
                        {!joined && (
                            <div className="border-b p-6">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={roomId}
                                        onChange={(e) => setRoomId(e.target.value)}
                                        placeholder="Room name"
                                        className="flex-1 rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                                    />
                                    <button
                                        onClick={joinRoom}
                                        disabled={!connected || joining}
                                        className="min-w-[130px] rounded-md bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:bg-gray-400"
                                    >
                                        {joining ? "Joining..." : "Join Room"}
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="h-[330px] overflow-y-auto bg-gray-50 p-6">
                            {roomMessages.length === 0 ? (
                                <p className="text-center text-gray-400">{joined ? "No messages yet" : "Join a room first"}</p>
                            ) : (
                                <div className="space-y-3">
                                    {roomMessages.map((m, i) => (
                                        <div key={i} className="rounded-lg bg-white p-4 shadow-sm">
                                            <p className="text-xs text-gray-400">{m.userId}</p>
                                            <p className="mt-1 text-gray-800">{m.message}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 border-t bg-white p-6">
                            <input
                                type="text"
                                value={roomInput}
                                onChange={(e) => setRoomInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendRoomMsg()}
                                placeholder={joined ? `Message room "${roomId}"...` : "Join a room first"}
                                disabled={!joined}
                                className="flex-1 rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 disabled:bg-gray-100"
                            />
                            <button
                                onClick={sendRoomMsg}
                                disabled={!joined}
                                className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                )}

                {/* ---------------- PRIVATE TAB ---------------- */}
                {tab === "private" && (
                    <div>
                        <div className="border-b p-6">
                            <label className="mb-2 block text-sm font-medium text-gray-700">Send to user ID</label>
                            <input
                                type="text"
                                value={targetUserId}
                                onChange={(e) => setTargetUserId(e.target.value)}
                                placeholder="e.g. bob"
                                className="w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                            />
                            {!registered && (
                                <p className="mt-2 text-xs text-red-500">Register your own user ID above first</p>
                            )}
                            {privateError && <p className="mt-2 text-xs text-red-500">{privateError}</p>}
                        </div>
                        <div className="h-[280px] overflow-y-auto bg-gray-50 p-6">
                            {privateMessages.length === 0 ? (
                                <p className="text-center text-gray-400">No private messages yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {privateMessages.map((m, i) => (
                                        <div
                                            key={i}
                                            className={`max-w-[75%] rounded-lg p-4 shadow-sm ${
                                                m.outgoing ? "ml-auto bg-blue-100" : "bg-white"
                                            }`}
                                        >
                                            <p className="text-xs text-gray-400">{m.outgoing ? "You" : m.fromUserId}</p>
                                            <p className="mt-1 text-gray-800">{m.message}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 border-t bg-white p-6">
                            <input
                                type="text"
                                value={privateInput}
                                onChange={(e) => setPrivateInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendPrivate()}
                                placeholder={registered ? "Type a private message..." : "Register first"}
                                disabled={!registered}
                                className="flex-1 rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 disabled:bg-gray-100"
                            />
                            <button
                                onClick={sendPrivate}
                                disabled={!registered || !targetUserId.trim()}
                                className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;