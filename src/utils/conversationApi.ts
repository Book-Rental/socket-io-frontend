import { Message } from "./types";

const CONVERSATION_API_BASE = `${import.meta.env.VITE_CHAT_API_URL}/api/conversations`;

export interface ConversationParticipant {
    _id: string;
    conversationId: string;
    userId: string;
    role: string;
    unreadCount: number;
    muted: boolean;
    archived: boolean;
    lastReadMessageId?: string;
    lastReadAt?: string;
    lastDeliveredMessageId?: string;
    lastDeliveredAt?: string;
}

export interface ConversationDetails {
    conversation: ConversationResponse & { unreadCount: number };
    participants: ConversationParticipant[];
    messages: Message[];
}

export interface ConversationResponse {
    _id: string;
    type: string;
    participants: string[];
}

export async function createPrivateConversation(
    user1: string,
    user2: string
): Promise<ConversationResponse> {
    const res = await fetch(`${CONVERSATION_API_BASE}/private`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user1, user2 }),
    });

    if (!res.ok) {
        throw new Error("Failed to create/fetch private conversation");
    }

    const data = await res.json();
    return data.conversation;
}

export async function fetchConversationDetails(
    conversationId: string,
    userId?: string,
    opts?: { limit?: number; before?: string }
): Promise<ConversationDetails> {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.before) params.set("before", opts.before);

    const res = await fetch(
        `${CONVERSATION_API_BASE}/${encodeURIComponent(conversationId)}/details?${params.toString()}`,
        { credentials: "include" }
    );
    if (!res.ok) throw new Error("Failed to fetch conversation details");

    const data = await res.json();
    return {
        ...data,
        messages: (data.messages ?? []).map((m: any) => ({ ...m, id: m._id })),
    };
}