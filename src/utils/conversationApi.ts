const CONVERSATION_API_BASE =
    `${import.meta.env.VITE_CHAT_API_URL}/api/conversations`;

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