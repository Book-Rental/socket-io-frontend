import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { socket } from "../socket";

export interface CurrentUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface AuthState {
    currentUser: CurrentUser | null;
}

const API_BASE = import.meta.env.VITE_API_URL as string;
const STORAGE_KEY = "socket_chat_username";

function loadUserFromStorage(): CurrentUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

const initialState: AuthState = {
    currentUser: loadUserFromStorage(),
};

export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
    try {
        const res = await fetch(`${API_BASE}/api/auth/logout`, {
            method: "GET",
            credentials: "include",
        });
        if (!res.ok) {
            console.warn("Backend logout failed");
        }
    } catch (error) {
        console.error("Logout request failed:", error);
    }
});

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        login: (state, action: PayloadAction<CurrentUser>) => {
            state.currentUser = action.payload;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload));

            if (!socket.connected) {
                socket.connect();
            } else {
                socket.emit("registerUser", action.payload.id);
            }
        },
    },
    extraReducers: (builder) => {
        builder.addCase(logoutUser.fulfilled, (state) => {
            socket.disconnect();
            localStorage.removeItem(STORAGE_KEY);
            state.currentUser = null;
        });
        // still clear local session even if the API call throws
        builder.addCase(logoutUser.rejected, (state) => {
            socket.disconnect();
            localStorage.removeItem(STORAGE_KEY);
            state.currentUser = null;
        });
    },
});

export const { login } = authSlice.actions;
export default authSlice.reducer;