import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";

import { socket } from "../socket";

export interface CurrentUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface AuthContextType {
    currentUser: CurrentUser | null;
    handleLogin: (user: CurrentUser) => void;
    handleLogout: () => Promise<boolean>;
}

const AuthContext = createContext<
    AuthContextType | undefined
>(undefined);

const API_BASE = import.meta.env.VITE_API_URL as string;

const STORAGE_KEY = "socket_chat_username";

export function AuthProvider({
    children,
}: {
    children: ReactNode;
}) {

    const [currentUser, setCurrentUser] =
        useState<CurrentUser | null>(() => {

            const raw =
                localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return null;
            }

            try {
                return JSON.parse(raw);
            } catch {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
        });


    const handleLogin = (user: CurrentUser) => {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(user)
        );

        setCurrentUser(user);

        if (!socket.connected) {
            socket.connect();
        } else {
            socket.emit(
                "registerUser",
                user.id
            );
        }
    };


    const handleLogout = async () => {
        try {
            const res = await fetch(
                `${API_BASE}/api/auth/logout`,
                {
                    method: "GET",
                    credentials: "include",
                }
            );

            if (!res.ok) {
                console.warn(
                    "Backend logout failed"
                );
            }

        } catch (error) {
            console.error(
                "Logout request failed:",
                error
            );

        } finally {

            socket.disconnect();

            localStorage.removeItem(
                STORAGE_KEY
            );

            setCurrentUser(null);
        }

        return true;
    };


    return (
        <AuthContext.Provider
            value={{
                currentUser,
                handleLogin,
                handleLogout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}


export function useAuth() {

    const context =
        useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }

    return context;
}