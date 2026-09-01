import { useState } from "react";
import { socket } from "../socket";

export interface CurrentUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

const API_BASE = import.meta.env.VITE_API_URL as string;
const STORAGE_KEY = "socket_chat_username";

export function useAuth() {
    const [currentUser, setCurrentUser] =
        useState<CurrentUser | null>(() => {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        });

    const handleLogin = (user: CurrentUser) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        setCurrentUser(user);
        if (!socket.connected) {
            socket.connect();
        } else {
            socket.emit("registerUser", user.id);
        }
    };

    const handleLogout = async () => {
        try {
            console.log("Logging out:", currentUser );

            const res = await fetch(
                `${API_BASE}/api/auth/logout`,
                {
                    method: "GET",
                    credentials: "include",
                }
            );

            const result = await res.json();

            if (!res.ok) {
                console.error( "Logout failed:", result?.message || "Logout failed" );
                return false;
            }

            console.log( "Logout successful:", result );
            socket.disconnect();
            localStorage.removeItem( STORAGE_KEY );
            setCurrentUser(null);
            return true;
        } catch (error) {
            console.error( "Logout error:", error );
            return false;
        }
    };

    return {
        currentUser,
        handleLogin,
        handleLogout,
    };
}
