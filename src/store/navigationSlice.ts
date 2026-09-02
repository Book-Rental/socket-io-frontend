import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { ChatMode } from "../utils/types";

interface NavigationState {
    mode: ChatMode;
    selectedUserId: string | null;
    selectedConversationId: string | null;
}

const initialState: NavigationState = {
    mode: "private",
    selectedUserId: null,
    selectedConversationId: null,
};

const navigationSlice = createSlice({
    name: "navigation",
    initialState,
    reducers: {
        setMode: (state, action: PayloadAction<ChatMode>) => {
            state.mode = action.payload;
        },
        setSelectedUser: (state, action: PayloadAction<string | null>) => {
            state.selectedUserId = action.payload;
        },
        setSelectedConversation: (
            state,
            action: PayloadAction<{ userId: string; conversationId: string }>
        ) => {
            state.selectedUserId = action.payload.userId;
            state.selectedConversationId = action.payload.conversationId;
        },
    },
});

export const { setMode, setSelectedUser, setSelectedConversation } = navigationSlice.actions;
export default navigationSlice.reducer;