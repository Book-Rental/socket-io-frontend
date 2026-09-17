import { ConversationSummary } from "../utils/chatApi";
import { BookRentalUser } from "../utils/userApi";
import { Rb_LoadingSpinner } from "@rentbook/rentbook-ui-lib";
interface SidebarProps {
    currentUserId: string;
    conversations: ConversationSummary[];
    usersById: Record<string, BookRentalUser>;
    onlineUserIds: string[];
    selectedConversationId: string | null;
    onConversationSelect: (userId: string, conversationId: string) => void;
    isLoading: boolean;
}

export default function Sidebar({
    currentUserId,
    conversations,
    usersById,
    onlineUserIds,
    selectedConversationId,
    onConversationSelect,
    isLoading,
}: SidebarProps) {
    return (
        <aside className="flex h-auto max-h-[45vh] w-full shrink-0 flex-col border-b border-slate-200 bg-white shadow-md sm:max-h-[40vh] lg:h-screen lg:max-h-none lg:w-80 lg:border-b-0 lg:border-r lg:border-slate-200">
            <div className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-5">
                <h1 className="font-semibold text-slate-800">Chats</h1>
            </div>

            {isLoading ? (
                <div className="flex min-h-0 flex-1 items-center justify-center">
                    <Rb_LoadingSpinner />
                </div>
            ) : conversations.length === 0 ? (
                <div className="flex min-h-0 flex-1 items-center justify-center px-4">
                    <div className="text-center">
                        <div className="mb-3 text-4xl">💬</div>
                        <p className="font-medium text-slate-600">No conversations yet</p>
                        <p className="mt-1 text-sm text-slate-400">
                            Search your friends and start a conversation
                        </p>
                    </div>
                </div>
            ) : (
                <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                    {conversations.map((conversation) => {
                        const otherUserId = conversation.participants.find(
                            (id) => id !== currentUserId
                        );
                        const otherUser = otherUserId ? usersById[otherUserId] : undefined;

                        if (!otherUserId || !otherUser) {
                            return null;
                        }

                        const fullName = `${otherUser.firstName} ${otherUser.lastName}`;
                        const isOnline = onlineUserIds.includes(otherUserId);
                        const isSelected = conversation._id === selectedConversationId;
                        const hasUnread = conversation.unreadCount > 0;

                        return (
                            <button
                                key={conversation._id}
                                type="button"
                                onClick={() =>
                                    onConversationSelect(otherUserId, conversation._id)
                                }
                                aria-current={isSelected ? "true" : undefined}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${isSelected
                                    ? "bg-blue-50"
                                    : "hover:bg-slate-50"
                                    }`}
                            >
                                <div className="relative shrink-0">
                                    {otherUser.profilePic ? (
                                        <img
                                            src={otherUser.profilePic}
                                            alt=""
                                            className="h-10 w-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                                            {otherUser.firstName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span
                                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${isOnline ? "bg-emerald-500" : "bg-slate-300"
                                            }`}
                                    />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p
                                        className={`truncate text-sm ${hasUnread
                                            ? "font-semibold text-slate-800"
                                            : "font-medium text-slate-700"
                                            }`}
                                    >
                                        {fullName}
                                    </p>
                                    <p className={`text-xs ${isOnline ? "text-emerald-500" : "text-slate-400"}`}>
                                        {isOnline ? "Online" : "Offline"}
                                    </p>
                                </div>

                                {hasUnread && (
                                    <span
                                        aria-label={`${conversation.unreadCount} unread messages`}
                                        className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white"
                                    >
                                        {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </aside>
    );
}