import { Message } from "./types";
interface RawMessage extends Omit<Message, "id"> {
    _id: string;
}

const CHAT_API_BASE = `${import.meta.env.VITE_CHAT_API_URL}/api/messages`;

export async function fetchPrivateHistory(userA: string, userB: string): Promise<Message[]> {
    const res = await fetch(`${CHAT_API_BASE}/private/${encodeURIComponent(userA)}/${encodeURIComponent(userB)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const messages = (data.messages ?? []).map((m: RawMessage) => ({ ...m, id: m._id }));
    return messages;
}

export async function fetchRoomHistory(roomId: string): Promise<Message[]> {
    const res = await fetch(`${CHAT_API_BASE}/room/${encodeURIComponent(roomId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const messages = (data.messages ?? []).map((m: RawMessage) => ({ ...m, id: m._id }));
    return messages;
}

export async function fetchBroadcastHistory(): Promise<Message[]> {
    const res = await fetch(`${CHAT_API_BASE}/broadcast`);
    if (!res.ok) return [];
    const data = await res.json();
    const messages = (data.messages ?? []).map((m: RawMessage) => ({ ...m, id: m._id }));
    return messages;
}

export async function fetchGroupHistory(userId: string): Promise<Message[]> {
    const res = await fetch(`${CHAT_API_BASE}/group/${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const messages = (data.messages ?? []).map((m: RawMessage) => ({ ...m, id: m._id }));
    return messages;
}