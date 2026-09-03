export type MessageStatus = "sent" | "delivered" | "read";
export type MessageContentKind = "text" | "emoji";

export interface MessageContent {
    type?: MessageContentKind;
    text?: string;
    mediaUrl?: string;
    mimeType?: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
    caption?: string;
    thumbnailUrl?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    contactName?: string;
    contactPhone?: string;
}
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    type: "text" | "image" | "file" | "audio" | "video" | "location" | "contact" | "system";
    content?: MessageContent;        
    clientMessageId?: string;
    replyTo?: string;
    status: MessageStatus;           
    editedAt?: string;               
    deletedAt?: string;              
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