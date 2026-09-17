import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MdWavingHand } from "react-icons/md";
import RecordRTC from "recordrtc";
import { socket } from "../../socket";
import { Message } from "../../utils/types";
import { useConversationHistory } from "../../hooks/queries/useConversationHistory";
import { showToast } from "../../utils/showToaster";
import {
    ConversationSummary,
    fetchUserConversations,
    uploadChatFile,
} from "../../utils/chatApi";
import DeleteConfirmationModal, { DeleteConfirmationState } from "./DeleteConfirmationModal";
import { resolveMessageType } from "./MessageUtils";
import BulkActionToolbar from "./BulkActionToolbar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import ForwardModal from "./ForwardModal";
import ChatHeader from "./ChatHeader";


interface OneToOneProps {
    username: string;
    selectedUser: string | null;
    selectedConversationId: string | null;
    usersById: Record<
        string,
        {
            _id: string;
            firstName: string;
            lastName: string;
            email: string;
        }
    >;
    onlineUserIds: string[];
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const micSupported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

export default function OneToOne({
    username,
    selectedUser,
    selectedConversationId,
    usersById,
    onlineUserIds,
}: OneToOneProps) {
    const queryClient = useQueryClient();

    const selectedUserName = selectedUser
        ? `${usersById[selectedUser]?.firstName ?? ""} ${usersById[selectedUser]?.lastName ?? ""
            }`.trim() || selectedUser
        : "";

    const isSelectedUserOnline = selectedUser
        ? onlineUserIds.includes(selectedUser)
        : false;

    const {
        data: messages = [],
        isLoading,
        isError,
    } = useConversationHistory(selectedConversationId);

    const [message, setMessage] = useState("");
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const messageInputRef = useRef<HTMLDivElement | null>(null);


    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

    const recorderRef = useRef<RecordRTC | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
        null
    );

    /* Message selection */
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
        new Set()
    );

    /* Delete confirmation */
    const [deleteConfirmation, setDeleteConfirmation] =
        useState<DeleteConfirmationState | null>(null);

    /* Forward */
    const [forwardTarget, setForwardTarget] = useState<Message | null>(null);
    const [bulkForwardMessages, setBulkForwardMessages] = useState<Message[]>(
        []
    );
    const [forwardCandidates, setForwardCandidates] = useState<
        ConversationSummary[]
    >([]);
    const [selectedForwardConversationIds, setSelectedForwardConversationIds] =
        useState<Set<string>>(new Set());
    const [isLoadingForwardList, setIsLoadingForwardList] = useState(false);
    const [forwardSearchTerm, setForwardSearchTerm] = useState("");

    const handleReply = (msg: Message) => {
        setReplyingTo(msg);
        setMenuOpenId(null);
    };
    const currentConversationMessages = useMemo(() => {
        if (!selectedConversationId) return [];

        return messages.filter(
            (msg) => msg.conversationId === selectedConversationId
        );
    }, [messages, selectedConversationId]);

    const selectedMessages = useMemo(
        () =>
            currentConversationMessages.filter((msg) =>
                selectedMessageIds.has(msg.id)
            ),
        [currentConversationMessages, selectedMessageIds]
    );

    const selectedCount = selectedMessageIds.size;

    /* Incoming messages */
    useEffect(() => {
        const handleIncoming = (newMessage: Message) => {
            if (
                newMessage.conversationId !==
                selectedConversationId
            ) {
                return;
            }

            queryClient.setQueryData<Message[]>(
                ["conversationMessages", selectedConversationId],
                (previousMessages = []) => {
                    if (
                        previousMessages.some(
                            (msg) => msg.id === newMessage.id
                        )
                    ) {
                        return previousMessages;
                    }

                    return [...previousMessages, newMessage].sort(
                        (a, b) =>
                            new Date(a.createdAt ?? 0).getTime() -
                            new Date(b.createdAt ?? 0).getTime()
                    );
                }
            );
        };

        socket.on("messageSent", handleIncoming);

        return () => {
            socket.off("messageSent", handleIncoming);
        };
    }, [queryClient, selectedConversationId]);

    /* Typing */
    useEffect(() => {
        const handleTyping = ({
            conversationId,
            userId,
        }: {
            conversationId: string;
            userId: string;
        }) => {
            if (conversationId === selectedConversationId) {
                setTypingUser(userId);
            }
        };

        const handleStopTyping = ({
            conversationId,
            userId,
        }: {
            conversationId: string;
            userId: string;
        }) => {
            if (
                conversationId === selectedConversationId &&
                userId === typingUser
            ) {
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

    /* Selection */
    const toggleSelectionMode = () => {
        setSelectionMode((prev) => !prev);
        setSelectedMessageIds(new Set());
        setMenuOpenId(null);
    };

    const toggleMessageSelection = (messageId: string) => {
        setSelectedMessageIds((previous) => {
            const next = new Set(previous);

            if (next.has(messageId)) {
                next.delete(messageId);
            } else {
                next.add(messageId);
            }

            return next;
        });
    };

    const selectAllMessages = () => {
        if (
            selectedCount === currentConversationMessages.length &&
            currentConversationMessages.length > 0
        ) {
            setSelectedMessageIds(new Set());
            return;
        }

        setSelectedMessageIds(
            new Set(currentConversationMessages.map((msg) => msg.id))
        );
    };

    const clearSelection = () => {
        setSelectedMessageIds(new Set());
        setSelectionMode(false);
    };

    /* Delete */
    const openDeleteConfirmation = (
        messageIds: string[],
        forEveryone: boolean
    ) => {
        if (!messageIds.length) {
            showToast("Select at least one message", "error");
            return;
        }

        setDeleteConfirmation({ messageIds, forEveryone });
        setMenuOpenId(null);
    };

    const closeDeleteConfirmation = () => {
        setDeleteConfirmation(null);
    };

    const confirmDeleteMessages = () => {
        if (!deleteConfirmation) return;

        const { messageIds, forEveryone } = deleteConfirmation;

        if (!socket.connected) {
            showToast("You're offline. Reconnecting...", "error");
            return;
        }

        messageIds.forEach((messageId) => {
            socket.emit("deleteMessage", { messageId, forEveryone });
        });

        showToast(
            `${messageIds.length} message${messageIds.length > 1 ? "s" : ""
            } deleted`,
            "success"
        );

        setDeleteConfirmation(null);

        setSelectedMessageIds((previous) => {
            const next = new Set(previous);
            messageIds.forEach((id) => next.delete(id));
            return next;
        });

        setSelectionMode(false);
    };

    /* Attachments */
    const clearAttachment = () => {
        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);

        setSelectedFile(null);
        setFilePreviewUrl(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
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
        setFilePreviewUrl(
            file.type.startsWith("image/") ? URL.createObjectURL(file) : null
        );
    };

    /* Voice */
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

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
                setRecordingDuration((duration) => duration + 1);
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
            recorderRef.current = null;
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
        const messageId = crypto.randomUUID();

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
                tempId: messageId,
            });

            discardRecording();
        } catch (error) {
            showToast("Failed to send voice message", "error");
            console.error("Voice message upload error:", error);
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        return () => {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }

            streamRef.current?.getTracks().forEach((track) => track.stop());

            if (recordedUrl) URL.revokeObjectURL(recordedUrl);
            if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Send */
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
        const messageId = crypto.randomUUID();

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
                    tempId: messageId,
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
                replyTo: replyingTo?.id,
                clientMessageId: `${username}-${Date.now()}`,
                tempId: messageId,
            });
        }

        socket.emit("typingStopped", { conversationId: selectedConversationId });

        setMessage("");
        setReplyingTo(null);
    };

    const handleTyping = (value: string) => {
        setMessage(value);

        if (!selectedConversationId || !socket.connected) return;

        socket.emit(value.trim() ? "typingStarted" : "typingStopped", {
            conversationId: selectedConversationId,
        });
    };

    /* Edit */
    const startEdit = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditText(msg.content?.text ?? "");
        setMenuOpenId(null);
    };

    const submitEdit = () => {
        if (!editingMessageId || !editText.trim()) return;

        socket.emit("editMessage", {
            messageId: editingMessageId,
            text: editText.trim(),
        });

        setEditingMessageId(null);
        setEditText("");
    };

    const cancelEdit = () => {
        setEditingMessageId(null);
        setEditText("");
    };

    /* Forward */
    const toggleForwardConversation = (conversationId: string) => {
        setSelectedForwardConversationIds((previous) => {
            const next = new Set(previous);

            if (next.has(conversationId)) {
                next.delete(conversationId);
            } else {
                next.add(conversationId);
            }

            return next;
        });
    };

    const getConversationDisplayName = (
        conversation: ConversationSummary
    ) => {
        const otherId =
            conversation.participants.find(
                (participant) => participant !== username
            ) ?? conversation._id;

        return (
            `${usersById[otherId]?.firstName ?? ""} ${usersById[otherId]?.lastName ?? ""
                }`.trim() || otherId
        );
    };

    const filteredForwardCandidates = useMemo(() => {
        const term = forwardSearchTerm.trim().toLowerCase();

        if (!term) return forwardCandidates;

        return forwardCandidates.filter((conversation) =>
            getConversationDisplayName(conversation).toLowerCase().includes(term)
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forwardCandidates, forwardSearchTerm, usersById, username]);

    const selectAllForwardConversations = () => {
        if (
            selectedForwardConversationIds.size ===
            filteredForwardCandidates.length
        ) {
            setSelectedForwardConversationIds(new Set());
            return;
        }

        setSelectedForwardConversationIds(
            new Set(
                filteredForwardCandidates.map((conversation) => conversation._id)
            )
        );
    };

    const loadForwardCandidates = async () => {
        setIsLoadingForwardList(true);

        try {
            const conversations = await fetchUserConversations(username);

            setForwardCandidates(
                conversations.filter(
                    (conversation) =>
                        conversation._id !== selectedConversationId
                )
            );
        } catch (error) {
            showToast("Failed to load conversations", "error");
            console.error("Forward list error:", error);
        } finally {
            setIsLoadingForwardList(false);
        }
    };

    const handleForwardMessage = async (msg: Message) => {
        setMenuOpenId(null);
        setForwardTarget(msg);
        setBulkForwardMessages([]);
        setSelectedForwardConversationIds(new Set());
        setForwardSearchTerm("");
        await loadForwardCandidates();
    };

    const handleBulkForward = async () => {
        if (selectedCount === 0) {
            showToast("Select at least one message", "error");
            return;
        }

        setMenuOpenId(null);
        setForwardTarget(null);
        setBulkForwardMessages(selectedMessages);
        setSelectedForwardConversationIds(new Set());
        setForwardSearchTerm("");
        await loadForwardCandidates();
    };

    const closeForwardModal = () => {
        setForwardTarget(null);
        setBulkForwardMessages([]);
        setForwardCandidates([]);
        setSelectedForwardConversationIds(new Set());
        setForwardSearchTerm("");
    };

    const forwardMessages = (
        messageIds: string[],
        conversationIds: string[]
    ) => {
        if (!socket.connected) {
            showToast("You're offline. Reconnecting...", "error");
            return false;
        }

        if (!messageIds.length) {
            showToast("Select at least one message", "error");
            return false;
        }

        if (!conversationIds.length) {
            showToast("Select at least one conversation", "error");
            return false;
        }

        messageIds.forEach((messageId) => {
            conversationIds.forEach((conversationId) => {
                socket.emit("forwardMessage", {
                    messageId,
                    conversationId,
                    clientMessageId: `${username}-forward-${messageId}-${conversationId}-${Date.now()}-${Math.random()}`,
                });
            });
        });

        return true;
    };

    const confirmForward = () => {
        const conversationIds = Array.from(selectedForwardConversationIds);

        if (!conversationIds.length) {
            showToast("Select at least one conversation", "error");
            return;
        }

        const messageIds =
            bulkForwardMessages.length > 0
                ? bulkForwardMessages.map((msg) => msg.id)
                : forwardTarget
                    ? [forwardTarget.id]
                    : [];

        if (forwardMessages(messageIds, conversationIds)) {
            showToast(
                `${messageIds.length} message${messageIds.length > 1 ? "s" : ""
                } forwarded to ${conversationIds.length} conversation${conversationIds.length > 1 ? "s" : ""
                }`,
                "success"
            );

            closeForwardModal();

            if (bulkForwardMessages.length > 0) {
                clearSelection();
            }
        }
    };

    /* Message updates */
    useEffect(() => {
        const updateMessage = (updated: Message) => {
            queryClient.setQueryData<Message[]>(
                ["conversationMessages", selectedConversationId],
                (previous = []) =>
                    previous.map((msg) => (msg.id === updated.id ? updated : msg))
            );
        };

        const handleDeleted = ({
            messageId,
            deletedAt,
        }: {
            messageId: string;
            deletedAt: string;
            forEveryone: boolean;
        }) => {
            queryClient.setQueryData<Message[]>(
                ["conversationMessages", selectedConversationId],
                (previous = []) =>
                    previous.map((msg) =>
                        msg.id === messageId
                            ? { ...msg, deletedAt, content: undefined }
                            : msg
                    )
            );

            setSelectedMessageIds((previous) => {
                const next = new Set(previous);
                next.delete(messageId);
                return next;
            });
        };

        const handleStatusUpdate = (data: {
            messageId: string;
            status: "delivered" | "read";
        }) => {
            queryClient.setQueryData<Message[]>(
                ["conversationMessages", selectedConversationId],
                (previous = []) =>
                    previous.map((msg) =>
                        msg.id === data.messageId
                            ? { ...msg, status: data.status }
                            : msg
                    )
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

    /* Read */
    useEffect(() => {
        if (!selectedConversationId || currentConversationMessages.length === 0) {
            return;
        }

        const lastMessage =
            currentConversationMessages[currentConversationMessages.length - 1];

        if (lastMessage.senderId === username || lastMessage.status === "read") {
            return;
        }

        socket.emit("messagesRead", {
            conversationId: selectedConversationId,
            messageId: lastMessage.id,
        });
    }, [currentConversationMessages, selectedConversationId, username]);

    /* Unread */
    useEffect(() => {
        const handleUnreadUpdate = (data: {
            conversationId: string;
            count: number;
        }) => {
            queryClient.setQueryData<ConversationSummary[]>(
                ["userConversations", username],
                (previous = []) =>
                    previous.map((conversation) =>
                        conversation._id === data.conversationId
                            ? { ...conversation, unreadCount: data.count }
                            : conversation
                    )
            );
        };

        socket.on("unreadCountUpdated", handleUnreadUpdate);

        return () => {
            socket.off("unreadCountUpdated", handleUnreadUpdate);
        };
    }, [queryClient, username]);

    if (!selectedConversationId) {
        return (
            <div className="flex h-full flex-1 items-center justify-center bg-slate-50 px-4">
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                        <MdWavingHand className="text-3xl text-blue-600 sm:text-4xl" />
                    </div>

                    <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
                        Start a conversation
                    </h2>

                    <p className="mt-2 text-sm text-slate-500 sm:text-base">
                        Search for a user above to begin chatting
                    </p>
                </div>
            </div>
        );
    }

    const isForwardModalOpen =
        forwardTarget !== null || bulkForwardMessages.length > 0;
    const forwardCount =
        bulkForwardMessages.length > 0 ? bulkForwardMessages.length : 1;

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
            <ChatHeader
                selectedUserName={selectedUserName}
                isSelectedUserOnline={isSelectedUserOnline}
                selectionMode={selectionMode}
                onToggleSelectionMode={toggleSelectionMode}
                onCancelSelection={clearSelection}
            />

            {selectionMode && (
                <BulkActionToolbar
                    selectedCount={selectedCount}
                    totalCount={currentConversationMessages.length}
                    onSelectAll={selectAllMessages}
                    onForward={handleBulkForward}
                    onDeleteForMe={() =>
                        openDeleteConfirmation(
                            Array.from(selectedMessageIds),
                            false
                        )
                    }
                    onDeleteForEveryone={() =>
                        openDeleteConfirmation(
                            Array.from(selectedMessageIds),
                            true
                        )
                    }
                />
            )}

            <MessageList
                messages={currentConversationMessages}
                username={username}
                selectedUserName={selectedUserName}
                isLoading={isLoading}
                isError={isError}
                typingUser={typingUser}
                selectionMode={selectionMode}
                selectedMessageIds={selectedMessageIds}
                editingMessageId={editingMessageId}
                editText={editText}
                menuOpenId={menuOpenId}
                onToggleSelect={toggleMessageSelection}
                onStartEdit={startEdit}
                onEditTextChange={setEditText}
                onSubmitEdit={submitEdit}
                onCancelEdit={cancelEdit}
                onToggleMenu={setMenuOpenId}
                onReply={handleReply}
                onForward={handleForwardMessage}
                onDeleteForMe={(messageId) =>
                    openDeleteConfirmation([messageId], false)
                }
                onDeleteForEveryone={(messageId) =>
                    openDeleteConfirmation([messageId], true)
                }
            />

            <ChatInput
                selectedUserName={selectedUserName}
                message={message}
                onMessageChange={handleTyping}
                messageInputRef={messageInputRef}
                selectedFile={selectedFile}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                filePreviewUrl={filePreviewUrl}
                fileInputRef={fileInputRef}
                onFileSelect={handleFileSelect}
                onClearAttachment={clearAttachment}
                onEmojiSelect={(emoji) => handleTyping(message + emoji)}
                isRecording={isRecording}
                recordingDuration={recordingDuration}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onCancelRecording={cancelRecording}
                recordedBlob={recordedBlob}
                recordedUrl={recordedUrl}
                onDiscardRecording={discardRecording}
                onSendVoiceMessage={sendVoiceMessage}
                isUploading={isUploading}
                isSocketConnected={socket.connected}
                micSupported={micSupported}
                onSubmit={handleSubmit}
            />

            <DeleteConfirmationModal
                confirmation={deleteConfirmation}
                onClose={closeDeleteConfirmation}
                onConfirm={confirmDeleteMessages}
            />

            <ForwardModal
                isOpen={isForwardModalOpen}
                forwardCount={forwardCount}
                candidates={forwardCandidates}
                filteredCandidates={filteredForwardCandidates}
                isLoading={isLoadingForwardList}
                searchTerm={forwardSearchTerm}
                selectedConversationIds={selectedForwardConversationIds}
                getConversationDisplayName={getConversationDisplayName}
                onSearchTermChange={setForwardSearchTerm}
                onToggleConversation={toggleForwardConversation}
                onSelectAll={selectAllForwardConversations}
                onClose={closeForwardModal}
                onConfirm={confirmForward}
            />
        </div>
    );
}