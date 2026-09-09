import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../socket";
import { Message } from "../utils/types";
import { useConversationHistory } from "../hooks/queries/useConversationHistory";
import { showToast } from "../utils/showToaster";
import EmojiPickerButton from "./EmojiPickerButton";
import { ConversationSummary, uploadChatFile } from "../utils/chatApi";
import {
    FiPaperclip,
    FiX,
    FiMoreVertical,
    FiFile,
    FiMessageCircle,
    FiAlertTriangle,
    FiMic,
    FiSquare,
    FiTrash2,
    FiSend,
} from "react-icons/fi";
import { HiOutlineHandRaised } from "react-icons/hi2";
import RecordRTC from "recordrtc";

interface OneToOneProps {
    username: string;
    selectedUser: string | null;
    selectedConversationId: string | null;
    usersById: Record<string, { _id: string; firstName: string; lastName: string; email: string }>;
    onlineUserIds: string[];
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // matches backend multer limit

const micSupported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

function resolveMessageType(mimeType: string): "image" | "video" | "audio" | "file" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "file";
}

function formatFileSize(bytes?: number): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
function linkifyText(text: string): React.ReactNode[] {
    if (!text) return [text];

    const parts = text.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi);

    return parts.map((part, index) => {
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
                onClick={(e) => e.stopPropagation()
                }
            >
                {part}
            </a >
        );
    });
}
export default function OneToOne({
    username,
    selectedUser,
    selectedConversationId,
    usersById,
    onlineUserIds,
}: OneToOneProps) {

    const selectedUserName = selectedUser
        ? `${usersById[selectedUser]?.firstName ?? ""} ${usersById[selectedUser]?.lastName ?? ""}`.trim() || selectedUser
        : "";
    const isSelectedUserOnline = selectedUser ? onlineUserIds.includes(selectedUser) : false;
    const [message, setMessage] = useState("");
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const { data: messages = [], isLoading, isError } = useConversationHistory(selectedConversationId);

    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // --- Voice recording state ---
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const recorderRef = useRef<RecordRTC | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const handleIncoming = (newMessage: Message) => {
            if (newMessage.conversationId !== selectedConversationId) {
                return;
            }

            queryClient.setQueryData<Message[]>(
                ["conversationMessages", selectedConversationId],
                (previousMessages = []) => {
                    const alreadyExists = previousMessages.some(
                        (msg) => msg.id === newMessage.id
                    );
                    if (alreadyExists) {
                        return previousMessages;
                    }
                    return [...previousMessages, newMessage].sort(
                        (a, b) =>
                            new Date(a.createdAt).getTime() -
                            new Date(b.createdAt).getTime()
                    );
                }
            );
        };

        socket.on("messageNew", handleIncoming);
        socket.on("messageSent", handleIncoming);

        return () => {
            socket.off("messageNew", handleIncoming);
            socket.off("messageSent", handleIncoming);
        };
    }, [queryClient, selectedConversationId]);

    useEffect(() => {
        const handleTyping = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
            if (conversationId === selectedConversationId) {
                setTypingUser(userId);
            }
        };

        const handleStopTyping = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
            if (conversationId === selectedConversationId && userId === typingUser) {
                setTypingUser(null);
            }
        };

        socket.on("typingStarted", handleTyping);
        socket.on("typingStopped", handleStopTyping);

        return () => {
            socket.off("typingStarted", handleTyping);
            socket.off("typingStopped", handleStopTyping);
        };
    }, [selectedConversationId, typingUser]);

    const currentConversationMessages = useMemo(() => {
        if (!selectedConversationId) {
            return [];
        }
        return messages.filter(
            (msg) => msg.conversationId === selectedConversationId
        );
    }, [messages, selectedConversationId]);

    const clearAttachment = () => {
        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        setSelectedFile(null);
        setFilePreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            showToast("File is too large (max 50MB)", "error");
            e.target.value = "";
            return;
        }

        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        setSelectedFile(file);
        setFilePreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    };

    // --- Voice recording handlers ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const recorder = new RecordRTC(stream, {
                type: "audio",
                recorderType: RecordRTC.StereoAudioRecorder,
                numberOfAudioChannels: 1,
                desiredSampRate: 16000,
            });

            recorder.startRecording();
            recorderRef.current = recorder;

            setIsRecording(true);
            setRecordingDuration(0);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration((d) => d + 1);
            }, 1000);
        } catch (error) {
            showToast("Microphone access denied", "error");
            console.error("Mic access error:", error);
        }
    };

    const stopRecording = () => {
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
        setIsRecording(false);

        recorderRef.current?.stopRecording(() => {
            const blob = recorderRef.current!.getBlob();
            setRecordedBlob(blob);
            setRecordedUrl(URL.createObjectURL(blob));

            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            recorderRef.current = null; // add this
        });
    };

    const cancelRecording = () => {
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
        setIsRecording(false);
        setRecordingDuration(0);

        recorderRef.current?.stopRecording(() => {
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            recorderRef.current = null;
        });
    };
    const discardRecording = () => {
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedBlob(null);
        setRecordedUrl(null);
        setRecordingDuration(0);
    };

    const sendVoiceMessage = async () => {
        if (!recordedBlob || !selectedConversationId) return;

        if (!socket.connected) {
            showToast("You're offline. Reconnecting...", "error");
            return;
        }

        try {
            setIsUploading(true);
            const file = new File(
                [recordedBlob],
                `voice-message-${Date.now()}.webm`,
                { type: recordedBlob.type || "audio/webm" }
            );

            const uploaded = await uploadChatFile(file);

            socket.emit("sendMessage", {
                conversationId: selectedConversationId,
                type: "audio",
                mediaUrl: uploaded.mediaUrl,
                mimeType: uploaded.mimeType,
                fileName: uploaded.fileName,
                fileSize: uploaded.fileSize,
                duration: recordingDuration,
                clientMessageId: `${username}-${Date.now()}`,
            });

            discardRecording();
        } catch (error) {
            showToast("Failed to send voice message", "error");
            console.error("Voice message upload error:", error);
        } finally {
            setIsUploading(false);
        }
    };

    // Cleanup on unmount: stop any live stream/timer/object URL
    useEffect(() => {
        return () => {
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            streamRef.current?.getTracks().forEach((track) => track.stop());
            if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const trimmedMessage = message.trim();

        if (!selectedConversationId || (!trimmedMessage && !selectedFile)) {
            return;
        }

        if (!socket.connected) {
            showToast("You're offline. Reconnecting...", "error");
            return;
        }

        if (selectedFile) {
            try {
                setIsUploading(true);
                const uploaded = await uploadChatFile(selectedFile);

                socket.emit("sendMessage", {
                    conversationId: selectedConversationId,
                    type: resolveMessageType(uploaded.mimeType),
                    mediaUrl: uploaded.mediaUrl,
                    mimeType: uploaded.mimeType,
                    fileName: uploaded.fileName,
                    fileSize: uploaded.fileSize,
                    caption: trimmedMessage || undefined,
                    clientMessageId: `${username}-${Date.now()}`,
                });

                clearAttachment();
            } catch (error) {
                showToast("Failed to upload file", "error");
                console.error("File upload error:", error);
                return;
            } finally {
                setIsUploading(false);
            }
        } else {
            socket.emit("sendMessage", {
                conversationId: selectedConversationId,
                text: trimmedMessage,
                type: "text",
                clientMessageId: `${username}-${Date.now()}`,
            });
        }

        socket.emit("typingStopped", {
            conversationId: selectedConversationId,
        });

        setMessage("");
    };

    const handleTyping = (value: string) => {
        setMessage(value);

        if (!selectedConversationId || !socket.connected) {
            return;
        }

        if (value.trim()) {
            socket.emit("typingStarted", {
                conversationId: selectedConversationId,
            });
        } else {
            socket.emit("typingStopped", {
                conversationId: selectedConversationId,
            });
        }
    };

    const startEdit = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditText(msg.content?.text ?? "");
    };

    const submitEdit = () => {
        if (!editingMessageId || !editText.trim()) return;
        socket.emit("editMessage", { messageId: editingMessageId, text: editText.trim() });
        setEditingMessageId(null);
        setEditText("");
    };

    const deleteMessage = (messageId: string, forEveryone: boolean) => {
        socket.emit("deleteMessage", { messageId, forEveryone });
    };

    useEffect(() => {
        const updateMessage = (updated: Message) => {
            queryClient.setQueryData<Message[]>(
                ["conversationMessages", selectedConversationId],
                (prev = []) => prev.map((m) => (m.id === updated.id ? updated : m))
            );
        };

        const handleDeleted = ({ messageId, deletedAt }: { messageId: string; deletedAt: string; forEveryone: boolean }) => {
            queryClient.setQueryData<Message[]>(
                ["conversationMessages", selectedConversationId],
                (prev = []) =>
                    prev.map((m) => (m.id === messageId ? { ...m, deletedAt, content: undefined } : m))
            );
        };

        const handleStatusUpdate = (data: { messageId: string; status: "delivered" | "read" }) => {
            queryClient.setQueryData<Message[]>(
                ["conversationMessages", selectedConversationId],
                (prev = []) =>
                    prev.map((m) => (m.id === data.messageId ? { ...m, status: data.status } : m))
            );
        };

        socket.on("messageEdited", updateMessage);
        socket.on("messageDeleted", handleDeleted);
        socket.on("messageDelivered", handleStatusUpdate);
        socket.on("messageRead", handleStatusUpdate);

        return () => {
            socket.off("messageEdited", updateMessage);
            socket.off("messageDeleted", handleDeleted);
            socket.off("messageDelivered", handleStatusUpdate);
            socket.off("messageRead", handleStatusUpdate);
        };
    }, [queryClient, selectedConversationId]);

    useEffect(() => {
        if (!selectedConversationId || currentConversationMessages.length === 0) return;

        const lastMessage = currentConversationMessages[currentConversationMessages.length - 1];
        if (lastMessage.senderId === username || lastMessage.status === "read") return;

        socket.emit("messagesRead", {
            conversationId: selectedConversationId,
            messageId: lastMessage.id,
        });
    }, [currentConversationMessages, selectedConversationId, username]);

    useEffect(() => {
        const handleUnreadUpdate = (data: { conversationId: string; count: number }) => {
            queryClient.setQueryData<ConversationSummary[]>(
                ["userConversations", username],
                (prev = []) =>
                    prev.map((c) =>
                        c._id === data.conversationId ? { ...c, unreadCount: data.count } : c
                    )
            );
        };

        socket.on("unreadCountUpdated", handleUnreadUpdate);
        return () => {
            socket.off("unreadCountUpdated", handleUnreadUpdate);
        };
    }, [queryClient, username]);

    const renderMessageContent = (msg: Message) => {
        if (msg.deletedAt) {
            return <p className="break-words text-sm italic opacity-60">This message was deleted</p>;
        }

        switch (msg.type) {
            case "image":
                return (
                    <div>
                        <a href={msg.content?.mediaUrl} target="_blank" rel="noopener noreferrer">
                            <img
                                src={msg.content?.mediaUrl}
                                alt={msg.content?.fileName ?? "image"}
                                className="max-h-64 w-full rounded-lg object-cover"
                            />
                        </a>
                        {msg.content?.caption && (
                            <p className="mt-1 break-words text-sm">{linkifyText(msg.content.caption)}</p>
                        )}
                    </div>
                );

            case "video":
                return (
                    <div>
                        <video
                            src={msg.content?.mediaUrl}
                            controls
                            className="max-h-64 w-full rounded-lg"
                        />
                        {msg.content?.caption && (
                            <p className="mt-1 break-words text-sm">{linkifyText(msg.content.caption)}</p>
                        )}
                    </div>
                );

            case "audio":
                return (
                    <div className="flex items-center gap-2">
                        <FiMic className="shrink-0 text-lg opacity-70" />
                        <audio src={msg.content?.mediaUrl} controls className="h-8 w-48 sm:w-56" />
                        {typeof msg.content?.duration === "number" && (
                            <span className="shrink-0 text-[10px] opacity-70">
                                {formatDuration(msg.content.duration)}
                            </span>
                        )}
                    </div>
                );

            case "file":
                return (

                    <a href={msg.content?.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2 hover:bg-black/20"
                    >
                        <FiFile className="shrink-0 text-xl" />
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                                {msg.content?.fileName ?? "File"}
                            </span>
                            <span className="block text-xs opacity-70">
                                {formatFileSize(msg.content?.fileSize)}
                            </span>
                        </span>
                    </a>
                );

            default:
                return <p className="break-words text-sm">{linkifyText(msg.content?.text ?? "")}</p>;
        }
    };

    if (!selectedConversationId) {
        return (
            <div className="flex h-full flex-1 items-center justify-center bg-white px-4">
                <div className="text-center">
                    <HiOutlineHandRaised className="mx-auto mb-4 text-5xl text-slate-400 sm:text-6xl" />
                    <h2 className="text-xl font-bold text-white sm:text-2xl">
                        Start a conversation
                    </h2>
                    <p className="mt-2 text-sm text-slate-400 sm:text-base">
                        Search for a user above to begin chatting
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
            <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white sm:h-11 sm:w-11">
                        {selectedUserName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate font-semibold text-blue-600">
                            {selectedUserName}
                        </h2>
                        <p className={`text-xs ${isSelectedUserOnline ? "text-emerald-400" : "text-slate-500"}`}>
                            {isSelectedUserOnline ? "● Online" : "● Offline"}
                        </p>
                    </div>
                </div>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-6">
                {isLoading && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <FiMessageCircle className="mx-auto mb-3 text-4xl text-slate-400" />
                            <p className="text-slate-400">Loading messages...</p>
                        </div>
                    </div>
                )}

                {isError && !isLoading && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <FiAlertTriangle className="mx-auto mb-3 text-4xl text-red-400" />
                            <p className="font-semibold text-red-400">Failed to load messages</p>
                            <p className="mt-1 text-sm text-slate-500">Please try again later.</p>
                        </div>
                    </div>
                )}

                {!isLoading && !isError && currentConversationMessages.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <FiMessageCircle className="mx-auto mb-3 text-4xl text-slate-400" />
                            <p className="text-slate-500">No messages yet</p>
                            <p className="mt-1 text-sm text-slate-600">
                                Start a conversation with {selectedUserName}
                            </p>
                        </div>
                    </div>
                )}

                {!isLoading && !isError && currentConversationMessages.map((msg) => {
                    const mine = msg.senderId === username;
                    return (
                        <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`relative max-w-[85%] rounded-2xl px-4 py-3 pr-7 sm:max-w-md ${mine
                                    ? "rounded-br-md bg-indigo-600 text-white"
                                    : "rounded-bl-md bg-slate-100 text-slate-800"
                                    }`}
                            >
                                {editingMessageId === msg.id ? (
                                    <div className="flex gap-2">
                                        <input
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            className="flex-1 rounded bg-slate-700 px-2 py-1 text-sm text-white outline-none"
                                            autoFocus
                                        />
                                        <button onClick={submitEdit} className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">Save</button>
                                        <button onClick={() => setEditingMessageId(null)} className="text-xs font-semibold text-white hover:text-slate-200">Cancel</button>
                                    </div>
                                ) : (
                                    renderMessageContent(msg)
                                )}

                                <div className="mt-1 flex items-center gap-1 text-[10px] opacity-60">
                                    <span>
                                        {new Date(msg.createdAt).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                    {mine && !msg.deletedAt && (
                                        <span className={msg.status === "read" ? "text-blue-400 font-bold" : msg.status === "delivered" ? "text-white font-bold" : "text-white/50"}>
                                            {msg.status === "sent" ? "✓" : "✓✓"}
                                        </span>
                                    )}
                                </div>

                                {mine && !msg.deletedAt && editingMessageId !== msg.id && (
                                    <div className="absolute right-1 top-1">
                                        <button
                                            onClick={() => setMenuOpenId(menuOpenId === msg.id ? null : msg.id)}
                                            className="rounded p-0.5 text-white/70 hover:bg-white/10 hover:text-white"
                                        >
                                            <FiMoreVertical />
                                        </button>
                                        {menuOpenId === msg.id && (
                                            <div className="absolute right-0 top-6 z-10 w-40 overflow-hidden rounded-lg bg-slate-700 py-1 text-xs shadow-lg">
                                                {msg.type === "text" && (
                                                    <button
                                                        onClick={() => { startEdit(msg); setMenuOpenId(null); }}
                                                        className="block w-full px-3 py-1.5 text-left text-white hover:bg-slate-600"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { deleteMessage(msg.id, false); setMenuOpenId(null); }}
                                                    className="block w-full px-3 py-1.5 text-left text-white hover:bg-slate-600"
                                                >
                                                    Delete for me
                                                </button>
                                                <button
                                                    onClick={() => { deleteMessage(msg.id, true); setMenuOpenId(null); }}
                                                    className="block w-full px-3 py-1.5 text-left text-red-300 hover:bg-slate-600"
                                                >
                                                    Delete for everyone
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {typingUser && (
                    <div className="text-sm text-slate-500">
                        {selectedUserName || typingUser} is typing...
                    </div>
                )}
            </div>

            <form
                onSubmit={handleSubmit}
                className="shrink-0 border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
            >
                {/* Recording in progress */}
                {isRecording && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
                        <span className="relative flex h-3 w-3 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                        </span>
                        <span className="flex-1 text-sm font-medium text-red-600">
                            Recording {formatDuration(recordingDuration)}
                        </span>
                        <button
                            type="button"
                            onClick={cancelRecording}
                            className="text-slate-500 hover:text-red-600"
                            title="Cancel recording"
                        >
                            <FiTrash2 />
                        </button>
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="shrink-0 rounded-full bg-red-500 p-2 text-white hover:bg-red-600"
                            title="Stop recording"
                        >
                            <FiSquare />
                        </button>
                    </div>
                )}

                {/* Recorded voice message preview, ready to send */}
                {!isRecording && recordedBlob && recordedUrl && (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
                        <FiMic className="shrink-0 text-lg text-slate-600" />
                        <audio src={recordedUrl} controls className="h-8 flex-1" />
                        <span className="shrink-0 text-xs text-slate-600">
                            {formatDuration(recordingDuration)}
                        </span>
                        <button
                            type="button"
                            onClick={discardRecording}
                            disabled={isUploading}
                            className="text-slate-500 hover:text-red-600 disabled:opacity-50"
                            title="Discard"
                        >
                            <FiTrash2 />
                        </button>
                        <button
                            type="button"
                            onClick={sendVoiceMessage}
                            disabled={isUploading}
                            className="shrink-0 rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-500 disabled:opacity-50"
                            title="Send voice message"
                        >
                            <FiSend />
                        </button>
                    </div>
                )}

                {/* Normal input row */}
                {!isRecording && !recordedBlob && (
                    <>
                        {selectedFile && (
                            <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                                {filePreviewUrl ? (
                                    <img src={filePreviewUrl} alt="preview" className="h-10 w-10 rounded object-cover" />
                                ) : (
                                    <FiFile className="text-xl text-slate-600" />
                                )}
                                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                    {selectedFile.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={clearAttachment}
                                    className="text-slate-500 hover:text-slate-800"
                                >
                                    <FiX />
                                </button>
                            </div>
                        )}

                        <div className="flex gap-2 sm:gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="shrink-0 rounded-xl border border-slate-300 px-3 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                                title="Attach a file"
                            >
                                <FiPaperclip />
                            </button>
                            <input
                                value={message}
                                onChange={(e) => handleTyping(e.target.value)}
                                placeholder={selectedFile ? "Add a caption..." : `Message ${selectedUserName}...`}
                                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-500 focus:border-indigo-500"
                            />
                            <EmojiPickerButton onEmojiSelect={(emoji) => handleTyping(message + emoji)} />

                            {message.trim() || selectedFile ? (
                                <button
                                    type="submit"
                                    disabled={!socket.connected || isUploading}
                                    className="shrink-0 rounded-xl bg-indigo-600 px-4 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
                                >
                                    {isUploading ? "Uploading..." : "Send"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    disabled={!socket.connected || isUploading || !micSupported}
                                    className="shrink-0 rounded-xl bg-indigo-600 px-4 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    title={micSupported ? "Record a voice message" : "Voice recording not supported"}
                                >
                                    <FiMic />
                                </button>
                            )}
                        </div>
                    </>
                )}
            </form>
        </div>
    );
}