export interface Message {
    id: string;
    from: string;
    to?: string;
    roomId?: string;
    content: string;
    timestamp: number;
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