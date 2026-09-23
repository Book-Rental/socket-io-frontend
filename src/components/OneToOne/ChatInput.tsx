import { FormEvent, useEffect } from "react";
import {
    FiFile,
    FiMic,
    FiPaperclip,
    FiSend,
    FiSquare,
    FiTrash2,
    FiX,
} from "react-icons/fi";
import EmojiPickerButton from "../EmojiPickerButton";
import { formatDuration } from "./MessageUtils";
import TextFormatting from "../TextFormatting";
import { Message } from "../../utils/types";
import ReplyPreview from "./ReplyPreview";

interface ChatInputProps {
    selectedUserName: string;
    message: string;
    onMessageChange: (value: string) => void;
    messageInputRef: React.RefObject<HTMLDivElement>;
    selectedFile: File | null;
    filePreviewUrl: string | null;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearAttachment: () => void;
    onEmojiSelect: (emoji: string, savedRange: Range | null) => void;
    isRecording: boolean;
    recordingDuration: number;
    onStartRecording: () => void;
    onStopRecording: () => void;
    onCancelRecording: () => void;
    recordedBlob: Blob | null;
    recordedUrl: string | null;
    onDiscardRecording: () => void;
    onSendVoiceMessage: () => void;
    isUploading: boolean;
    isSocketConnected: boolean;
    micSupported: boolean;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    replyingTo: Message | null;
    onCancelReply: () => void;
}

export default function ChatInput({
    selectedUserName,
    message,
    onMessageChange,
    messageInputRef,
    selectedFile,
    filePreviewUrl,
    fileInputRef,
    onFileSelect,
    onClearAttachment,
    onEmojiSelect,
    isRecording,
    recordingDuration,
    onStartRecording,
    onStopRecording,
    onCancelRecording,
    recordedBlob,
    recordedUrl,
    onDiscardRecording,
    onSendVoiceMessage,
    isUploading,
    isSocketConnected,
    micSupported,
    onSubmit,
    replyingTo,
    onCancelReply,
}: ChatInputProps) {
    useEffect(() => {
        if (message === "" && messageInputRef.current) {
            messageInputRef.current.innerHTML = "";
        }
    }, [message, messageInputRef]);
    return (
        <form
            onSubmit={onSubmit}
            className="shrink-0 border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
        >
            {replyingTo && (
                <div className="mb-2">
                    <ReplyPreview
                        message={replyingTo}
                        senderName={replyingTo.senderId}
                        onCancel={onCancelReply}
                    />
                </div>
            )}
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
                        onClick={onCancelRecording}
                        className="text-slate-500 hover:text-red-600"
                    >
                        <FiTrash2 />
                    </button>

                    <button
                        type="button"
                        onClick={onStopRecording}
                        className="shrink-0 rounded-full bg-red-500 p-2 text-white hover:bg-red-600"
                    >
                        <FiSquare />
                    </button>
                </div>
            )}

            {!isRecording && recordedBlob && recordedUrl && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
                    <FiMic className="shrink-0 text-lg text-slate-600" />

                    <audio src={recordedUrl} controls className="h-8 flex-1" />

                    <span className="shrink-0 text-xs text-slate-600">
                        {formatDuration(recordingDuration)}
                    </span>

                    <button
                        type="button"
                        onClick={onDiscardRecording}
                        disabled={isUploading}
                        className="text-slate-500 hover:text-red-600 disabled:opacity-50"
                    >
                        <FiTrash2 />
                    </button>

                    <button
                        type="button"
                        onClick={onSendVoiceMessage}
                        disabled={isUploading}
                        className="shrink-0 rounded-full bg-blue-600 p-2 text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                        <FiSend />
                    </button>
                </div>
            )}

            {!isRecording && !recordedBlob && (
                <>
                    {selectedFile && (
                        <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                            {filePreviewUrl ? (
                                <img
                                    src={filePreviewUrl}
                                    alt="preview"
                                    className="h-10 w-10 rounded object-cover"
                                />
                            ) : (
                                <FiFile className="text-xl text-slate-600" />
                            )}

                            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                {selectedFile.name}
                            </span>

                            <button
                                type="button"
                                onClick={onClearAttachment}
                                className="text-slate-500 hover:text-slate-800"
                            >
                                <FiX />
                            </button>
                        </div>
                    )}

                    <div className="flex items-end gap-2 sm:gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={onFileSelect}
                            className="hidden"
                        />

                        <div className="relative flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 pl-4 pr-2 focus-within:border-blue-500">
                            <div
                                ref={messageInputRef}
                                contentEditable
                                suppressContentEditableWarning
                                role="textbox"
                                aria-multiline="true"
                                data-placeholder={
                                    selectedFile
                                        ? "Add a caption..."
                                        : `Message ${selectedUserName}...`
                                }
                                onInput={(e) => {
                                    onMessageChange(e.currentTarget.innerText);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        e.currentTarget.closest("form")?.requestSubmit();
                                    }
                                }}
                                className="min-h-[24px] min-w-0 flex-1 overflow-y-auto bg-transparent py-3 text-slate-800 outline-none empty:before:pointer-events-none empty:before:text-slate-500 empty:before:content-[attr(data-placeholder)]"
                            />

                            <TextFormatting editorRef={messageInputRef} />
                            <EmojiPickerButton
                                onEmojiSelect={onEmojiSelect}
                                messageInputRef={messageInputRef}
                            />

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
                            >
                                <FiPaperclip />
                            </button>

                            <button
                                type="button"
                                onClick={onStartRecording}
                                disabled={
                                    !isSocketConnected ||
                                    isUploading ||
                                    !micSupported
                                }
                                className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
                            >
                                <FiMic />
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={
                                !isSocketConnected ||
                                isUploading ||
                                (!message.trim() && !selectedFile)
                            }
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isUploading ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <FiSend className="text-lg" />
                            )}
                        </button>
                    </div>
                </>
            )}
        </form>
    );
}