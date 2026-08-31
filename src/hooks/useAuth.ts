import { useState } from "react";

import { socket } from "../socket";

const API_BASE =
    import.meta.env.VITE_API_URL as string;

const STORAGE_KEY =
    "socket_chat_username";

export function useAuth() {
    const [username, setUsername] =
        useState<string | null>(() => {
            return localStorage.getItem(
                STORAGE_KEY
            );
        });

    const handleLogin = (user: string) => {
        console.log(
            "Logged in user:",
            user
        );

        /*
         * Persist username so refresh
         * does not log the user out.
         */
        localStorage.setItem(
            STORAGE_KEY,
            user
        );

        setUsername(user);

        /*
         * Connect Socket.IO after login.
         */
        if (!socket.connected) {
            socket.connect();
        }
    };

    const handleLogout = async () => {
        try {
            console.log(
                "Logging out:",
                username
            );

            const res = await fetch(
                `${API_BASE}/api/auth/logout`,
                {
                    method: "GET",
                    credentials: "include",
                }
            );

            const result =
                await res.json();

            if (!res.ok) {
                console.error(
                    "Logout failed:",
                    result?.message ||
                    "Logout failed"
                );

                return false;
            }

            console.log(
                "Logout successful:",
                result
            );

            /*
             * Disconnect Socket.IO.
             */
            socket.disconnect();

            /*
             * Remove persisted user.
             */
            localStorage.removeItem(
                STORAGE_KEY
            );

            /*
             * Clear React state.
             */
            setUsername(null);

            return true;
        } catch (error) {
            console.error(
                "Logout error:",
                error
            );

            return false;
        }
    };

    return {
        username,
        handleLogin,
        handleLogout,
    };
}
