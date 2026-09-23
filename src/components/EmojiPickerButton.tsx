import { useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";

interface EmojiPickerButtonProps {
    onEmojiSelect: (emoji: string, range: Range | null) => void;
    messageInputRef: React.RefObject<HTMLDivElement>;
}

export default function EmojiPickerButton({
    onEmojiSelect,
    messageInputRef,
}: EmojiPickerButtonProps) {
    const [showEmojiPicker, setShowEmojiPicker] =
        useState(false);

    const savedRangeRef = useRef<Range | null>(null);

    const saveSelection = () => {
        const input = messageInputRef.current;
        const selection = window.getSelection();

        if (!input || !selection || selection.rangeCount === 0) {
            return;
        }

        const range = selection.getRangeAt(0);

        if (input.contains(range.commonAncestorContainer)) {
            savedRangeRef.current = range.cloneRange();
        }
    };

    const handleEmojiButtonClick = () => {
        saveSelection();

        setShowEmojiPicker((previous) => !previous);
    };

    const handleEmojiClick = (emojiData: { emoji: string }) => {
        onEmojiSelect(emojiData.emoji, savedRangeRef.current);
    };

    return (
        <div className="relative shrink-0">
            {showEmojiPicker && (
                <div className="absolute bottom-14 right-0 z-50">
                    <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        width={350}
                        height={400}
                    />
                </div>
            )}

            <button
                type="button"
                onClick={handleEmojiButtonClick}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-0 text-base text-slate-500 hover:bg-slate-200"
            >
                😊
            </button>
        </div>
    );
}
