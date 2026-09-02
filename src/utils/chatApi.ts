import { Message } from "./types";

export interface ConversationSummary {
    _id: string;
    type: string;
    participants: string[];
    lastMessageId?: string;
    lastMessageAt?: string;
    messageCount: number;
    unreadCount: number;
}

interface RawMessage extends Omit<Message, "id"> {
    _id: string;
}

const CHAT_API_BASE = `${import.meta.env.VITE_CHAT_API_URL}/api/messages`;

export async function fetchConversationHistory(
    conversationId: string
): Promise<Message[]> {

    const res = await fetch(
        `${CHAT_API_BASE}/conversation/${encodeURIComponent(conversationId)}`,
        { credentials: "include" }
    );

    if (!res.ok) {
        throw new Error(
            "Failed to fetch conversation history"
        );
    }

    const data = await res.json();

    return (data.messages ?? []).map(
        (m: RawMessage) => ({
            ...m,
            id: m._id,
        })
    );
}

export async function fetchRoomHistory(
    roomId: string
): Promise<Message[]> {
    const res = await fetch(
        `${CHAT_API_BASE}/room/${encodeURIComponent(roomId)}`
    );
    if (!res.ok) {
        throw new Error("Failed to fetch room history");
    }
    const data = await res.json();
    return (data.messages ?? []).map(
        (m: RawMessage) => ({ ...m, id: m._id })
    );
}

export async function fetchBroadcastHistory(): Promise<Message[]> {
    const res = await fetch(`${CHAT_API_BASE}/broadcast`);
    if (!res.ok) {
        throw new Error("Failed to fetch broadcast history");
    }
    const data = await res.json();
    return (data.messages ?? []).map(
        (m: RawMessage) => ({ ...m, id: m._id })
    );
}

export async function fetchGroupHistory(
    userId: string
): Promise<Message[]> {
    const res = await fetch(
        `${CHAT_API_BASE}/group/${encodeURIComponent(userId)}`
    );
    if (!res.ok) {
        throw new Error("Failed to fetch group history");
    }
    const data = await res.json();
    return (data.messages ?? []).map(
        (m: RawMessage) => ({ ...m, id: m._id })
    );
}

export async function fetchUserConversations(
    userId: string
): Promise<ConversationSummary[]> {

    const res = await fetch(
        `${CHAT_API_BASE}/conversations/${encodeURIComponent(userId)}`,
        { credentials: "include" }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch user conversations");
    }

    const data = await res.json();
    return data.conversations ?? [];
}