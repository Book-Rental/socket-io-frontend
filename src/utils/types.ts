export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    type: "text" | "image" | "file" | "audio" | "video" | "system";
    content?: string;
    clientMessageId?: string;
    replyTo?: string;
    createdAt: string;
    updatedAt: string;
}

export type ChatMode =
    | "private"
    | "broadcast"
    | "rooms"
    | "group";

export interface Room {
    id: string;
    name: string;
}