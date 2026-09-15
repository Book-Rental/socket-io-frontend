import { RefObject, useState } from "react";
import {
    FiBold,
    FiItalic,
    FiMinus,
    FiType,
} from "react-icons/fi";

interface TextFormattingProps {
    editorRef: RefObject<HTMLDivElement | null>;
}

export default function TextFormatting({
    editorRef,
}: TextFormattingProps) {
    const [open, setOpen] = useState(false);

    const applyFormatting = (command: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.focus();

        document.execCommand(command, false);

        setOpen(false);
    };

    return (
        <div className="relative shrink-0">
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen((prev) => !prev)}
                className={`rounded-lg p-2 transition ${
                    open
                        ? "bg-blue-100 text-blue-600"
                        : "text-slate-500 hover:bg-slate-200"
                }`}
                title="Formatting"
            >
                <FiType />
            </button>

            {open && (
                <div className="absolute bottom-full left-0 z-20 mb-2 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFormatting("bold")}
                        className="rounded px-2 py-1.5 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                        title="Bold"
                    >
                        <FiBold />
                    </button>

                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFormatting("italic")}
                        className="rounded px-2 py-1.5 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                        title="Italic"
                    >
                        <FiItalic />
                    </button>

                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFormatting("strikeThrough")}
                        className="rounded px-2 py-1.5 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                        title="Strikethrough"
                    >
                        <FiMinus />
                    </button>
                </div>
            )}
        </div>
    );
}