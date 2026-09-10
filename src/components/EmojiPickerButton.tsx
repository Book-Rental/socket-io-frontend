import { useState } from "react";
import EmojiPicker from "emoji-picker-react";

interface EmojiPickerButtonProps {
    onEmojiSelect: (emoji: string) => void;
}

export default function EmojiPickerButton({
    onEmojiSelect,
}: EmojiPickerButtonProps) {
    const [showEmojiPicker, setShowEmojiPicker] =
        useState(false);

    const handleEmojiClick = (emojiData: {
        emoji: string;
    }) => {
        onEmojiSelect(emojiData.emoji);
        setShowEmojiPicker(false);
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
                onClick={() =>
                    setShowEmojiPicker(
                        (previous) => !previous
                    )
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-0 text-base text-slate-500 hover:bg-slate-200"
            >
                😊
            </button>

        </div>
    );
}