import { FiMoreVertical, FiPhone, FiVideo } from "react-icons/fi";
import { BookRentalUser } from "../../utils/userApi";

interface ChatHeaderProps {
    selectedUser: string | null;
    selectedUserName: string;
    isSelectedUserOnline: boolean;
    selectionMode: boolean;
    onToggleSelectionMode: () => void;
    onCancelSelection: () => void;
    usersById: Record<string, BookRentalUser>;
    onStartAudioCall: () => void;   // NEW
    onStartVideoCall: () => void;
}

export default function ChatHeader({
    selectedUser,
    selectedUserName,
    isSelectedUserOnline,
    selectionMode,
    onToggleSelectionMode,
    onCancelSelection,
    usersById,
    onStartAudioCall,   // NEW
    onStartVideoCall,
}: ChatHeaderProps) {
    const otherUser = selectedUser ? usersById[selectedUser] : undefined;

    return (
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                        {otherUser?.profilePic ? (
                            <img
                                src={otherUser.profilePic}
                                alt={selectedUserName}
                                className="h-10 w-10 rounded-full object-cover sm:h-11 sm:w-11"
                            />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 sm:h-11 sm:w-11">
                                {otherUser?.firstName?.charAt(0).toUpperCase() ||
                                    selectedUserName.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <span
                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${isSelectedUserOnline
                                ? "bg-emerald-500"
                                : "bg-slate-300"
                                }`}
                        />
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

                {/* {!selectionMode ? (
                    <button
                        type="button"
                        onClick={onToggleSelectionMode}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        title="Select messages"
                        aria-label="Select messages"
                    >
                        <FiMoreVertical size={20} />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onCancelSelection}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                )} */}


                <div className="flex items-center gap-1">
                    {!selectionMode && (
                        <>
                            <button
                                type="button"
                                onClick={onStartAudioCall}
                                disabled={!isSelectedUserOnline}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-40"
                                title="Audio call"
                                aria-label="Start audio call"
                            >
                                <FiPhone size={18} />
                            </button>

                            <button
                                type="button"
                                onClick={onStartVideoCall}
                                disabled={!isSelectedUserOnline}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-40"
                                title="Video call"
                                aria-label="Start video call"
                            >
                                <FiVideo size={18} />
                            </button>
                        </>
                    )}

                    {!selectionMode ? (
                        <button
                            type="button"
                            onClick={onToggleSelectionMode}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                            title="Select messages"
                            aria-label="Select messages"
                        >
                            <FiMoreVertical size={20} />
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
            </div>
        </header>
    );
}
