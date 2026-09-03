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
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-xl text-slate-500 transition hover:bg-slate-100 hover:text-yellow-500"
                aria-label="Open emoji picker"
            >
                😊
            </button>

        </div>
    );
}