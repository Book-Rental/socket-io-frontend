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

            const savedUsername =
                localStorage.getItem(STORAGE_KEY);

            if (savedUsername) {
                console.log(
                    "Registering restored user:",
                    savedUsername
                );

                socket.emit(
                    "registerUser",
                    savedUsername
                );
            }
        };

        const handleDisconnect = (reason: string) => {
            console.log(
                "Socket disconnected:",
                reason
            );
        };

        const handleConnectError = (error: Error) => {
            console.error(
                "Socket connection error:",
                error.message
            );
        };

        socket.on(
            "onlineUsers",
            handleOnlineUsers
        );

        socket.on(
            "connect",
            handleConnect
        );

        socket.on(
            "disconnect",
            handleDisconnect
        );

        socket.on(
            "connect_error",
            handleConnectError
        );

        const savedUsername =
            localStorage.getItem(STORAGE_KEY);

        if (
            savedUsername &&
            !socket.connected
        ) {
            socket.connect();
        }

        return () => {
            socket.off(
                "onlineUsers",
                handleOnlineUsers
            );

            socket.off(
                "connect",
                handleConnect
            );

            socket.off(
                "disconnect",
                handleDisconnect
            );

            socket.off(
                "connect_error",
                handleConnectError
            );
        };
    }, []);

    return {
        socket,
        onlineUsers,
    };
}