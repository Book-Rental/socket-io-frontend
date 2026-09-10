import { FiSquare as FiSelect } from "react-icons/fi";

interface ChatHeaderProps {
    selectedUserName: string;
    isSelectedUserOnline: boolean;
    selectionMode: boolean;
    onToggleSelectionMode: () => void;
    onCancelSelection: () => void;
}

export default function ChatHeader({
    selectedUserName,
    isSelectedUserOnline,
    selectionMode,
    onToggleSelectionMode,
    onCancelSelection,
}: ChatHeaderProps) {
    return (
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white sm:h-11 sm:w-11">
                        {selectedUserName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                        <h2 className="truncate font-semibold text-blue-600">
                            {selectedUserName}
                        </h2>

                        <p
                            className={`text-xs ${isSelectedUserOnline
                                    ? "text-emerald-400"
                                    : "text-slate-500"
                                }`}
                        >
                            {isSelectedUserOnline ? "● Online" : "● Offline"}
                        </p>
                    </div>
                </div>

                {!selectionMode ? (
                    <button
                        type="button"
                        onClick={onToggleSelectionMode}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        title="Select messages"
                    >
                        <FiSelect />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onCancelSelection}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </header>
    );
}