import React from "react";

export function resolveMessageType(
    mimeType: string
): "image" | "video" | "audio" | "file" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "file";
}

export function formatFileSize(bytes?: number): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function linkifyText(text: string): React.ReactNode[] {
    if (!text) return [text];

    return text
        .split(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi)
        .map((part, index) => {
            const isUrl = /^(https?:\/\/|www\.)/i.test(part);

            if (!isUrl) return part;

            const href = part.startsWith("www.") ? `https://${part}` : part;

            return (
                <a
                    key={index}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:opacity-80"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        });
}