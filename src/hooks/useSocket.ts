import { useEffect, useState } from "react";
import { socket } from "../socket";

const STORAGE_KEY = "socket_chat_username";

export function useSocket() {
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    useEffect(() => {
        const handleOnlineUsers = (users: string[]) => {
            console.log("Online users:", users);
            setOnlineUsers(users);
        };

        const handleConnect = () => {
            console.log("Socket connected:", socket.id);
            const raw = localStorage.getItem(STORAGE_KEY);
            const savedUser = raw ? JSON.parse(raw) : null;

            if (savedUser) {
                console.log("Registering restored user:", savedUser.id);
                socket.emit("registerUser", savedUser.id);
            }
        };

        const handleDisconnect = (reason: string) => {
            console.log( "Socket disconnected:", reason );
        };

        const handleConnectError = (error: Error) => {
            console.error( "Socket connection error:", error.message );
        };

        socket.on( "onlineUsers", handleOnlineUsers );
        socket.on( "connect",  handleConnect );
        socket.on( "disconnect", handleDisconnect );
        socket.on( "connect_error", handleConnectError );

        const raw = localStorage.getItem(STORAGE_KEY);
        const savedUser = raw ? JSON.parse(raw) : null;

        if (savedUser && !socket.connected) {
            socket.connect();   // triggers the "connect" event above, which then registers
        } else if (savedUser && socket.connected) {
            socket.emit("registerUser", savedUser.id);   // already connected somehow — register directly
        }

        return () => {
            socket.off( "onlineUsers", handleOnlineUsers );
            socket.off( "connect", handleConnect );
            socket.off( "disconnect", handleDisconnect );
            socket.off( "connect_error", handleConnectError );
        };
    }, []);

    return {
        socket,
        onlineUsers,
    };
}