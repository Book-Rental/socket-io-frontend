import { FiCornerUpRight, FiMessageCircle, FiSearch, FiX } from "react-icons/fi";
import { ConversationSummary } from "../../utils/chatApi";

interface ForwardModalProps {
    isOpen: boolean;
    forwardCount: number;
    candidates: ConversationSummary[];
    filteredCandidates: ConversationSummary[];
    isLoading: boolean;
    searchTerm: string;
    selectedConversationIds: Set<string>;
    getConversationDisplayName: (conversation: ConversationSummary) => string;
    onSearchTermChange: (value: string) => void;
    onToggleConversation: (conversationId: string) => void;
    onSelectAll: () => void;
    onClose: () => void;
    onConfirm: () => void;
}

export default function ForwardModal({
    isOpen,
    forwardCount,
    candidates,
    filteredCandidates,
    isLoading,
    searchTerm,
    selectedConversationIds,
    getConversationDisplayName,
    onSearchTermChange,
    onToggleConversation,
    onSelectAll,
    onClose,
    onConfirm,
}: ForwardModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="flex w-full max-w-sm flex-col rounded-xl bg-white p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-800">
                            Forward message
                            {forwardCount > 1 && (
                                <span className="ml-1 text-blue-600">
                                    ({forwardCount})
                                </span>
                            )}
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-500">
                            Select one or more conversations
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                    >
                        <FiX />
                    </button>
                </div>

                {!isLoading && candidates.length > 0 && (
                    <div className="relative mb-3">
                        <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            value={searchTerm}
                            onChange={(e) =>
                                onSearchTermChange(e.target.value)
                            }
                            placeholder="Search conversations..."
                            autoFocus
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-8 text-sm text-slate-800 outline-none focus:border-blue-500"
                        />

                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => onSearchTermChange("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400"
                            >
                                <FiX />
                            </button>
                        )}
                    </div>
                )}

                {isLoading && (
                    <div className="py-8 text-center">
                        <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                        <p className="text-sm text-slate-500">
                            Loading conversations...
                        </p>
                    </div>
                )}

                {!isLoading && candidates.length === 0 && (
                    <div className="py-8 text-center">
                        <FiMessageCircle className="mx-auto mb-2 text-3xl text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">
                            No other conversations
                        </p>
                    </div>
                )}

                {!isLoading &&
                    candidates.length > 0 &&
                    filteredCandidates.length === 0 && (
                        <div className="py-8 text-center">
                            <FiSearch className="mx-auto mb-2 text-3xl text-slate-300" />
                            <p className="text-sm font-medium text-slate-600">
                                No matches
                            </p>
                        </div>
                    )}

                {!isLoading && filteredCandidates.length > 0 && (
                    <>
                        <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2">
                            <button
                                type="button"
                                onClick={onSelectAll}
                                className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                            >
                                {selectedConversationIds.size ===
                                    filteredCandidates.length
                                    ? "Unselect all"
                                    : "Select all"}
                            </button>

                            <span className="text-xs text-slate-500">
                                {selectedConversationIds.size} selected
                            </span>
                        </div>

                        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                            {filteredCandidates.map((conversation) => {
                                const isSelected =
                                    selectedConversationIds.has(
                                        conversation._id
                                    );

                                return (
                                    <button
                                        key={conversation._id}
                                        type="button"
                                        onClick={() =>
                                            onToggleConversation(
                                                conversation._id
                                            )
                                        }
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${isSelected
                                                ? "bg-blue-50 text-blue-700"
                                                : "text-slate-700 hover:bg-slate-100"
                                            }`}
                                    >
                                        <span
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isSelected
                                                    ? "border-blue-600 bg-blue-600 text-white"
                                                    : "border-slate-300 bg-white"
                                                }`}
                                        >
                                            {isSelected && (
                                                <svg
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                    className="h-3.5 w-3.5"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.415 0l-3.25-3.25a1 1 0 111.415-1.42l2.543 2.544 6.543-6.544a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            )}
                                        </span>

                                        <span className="min-w-0 flex-1 truncate font-medium">
                                            {getConversationDisplayName(
                                                conversation
                                            )}
                                        </span>

                                        <FiCornerUpRight
                                            className={
                                                isSelected
                                                    ? "text-blue-600"
                                                    : "text-slate-400"
                                            }
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {!isLoading && candidates.length > 0 && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                        <span className="text-xs text-slate-500">
                            {selectedConversationIds.size
                                ? `${selectedConversationIds.size} selected`
                                : "Select conversations"}
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={selectedConversationIds.size === 0}
                                onClick={onConfirm}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <FiCornerUpRight />
                                Forward
                                {selectedConversationIds.size > 0 && (
                                    <span>
                                        ({selectedConversationIds.size})
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}