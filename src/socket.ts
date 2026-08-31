import { io } from "socket.io-client";

export const socket = io(
    import.meta.env.VITE_CHAT_API_URL,
    {
        autoConnect: false
    }
);