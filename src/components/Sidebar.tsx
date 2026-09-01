import { ChatMode } from "../utils/types";
import { BookRentalUser } from "../utils/userApi";

interface SidebarProps {
    username: string;             // current user's id
    displayName: string;
    mode: ChatMode;
    allUsers: BookRentalUser[];
    onlineUserIds: string[];
    selectedUser: string | null;
    onModeChange: (mode: ChatMode) => void;
    onUserSelect: (userId: string) => void;
    onLogout: () => void;
}

const navigationItems: {
    mode: ChatMode;
    icon: string;
    label: string;
}[] = [
        {
            mode: "private",
            icon: "👤",
            label: "One-to-One",
        },
        {
            mode: "broadcast",
            icon: "📢",
            label: "Broadcast",
        },
        {
            mode: "rooms",
            icon: "🏠",
            label: "Rooms",
        },
        {
            mode: "group",
            icon: "👥",
            label: "One-to-Many",
        },
    ];

export default function Sidebar({
    username,
    displayName,
    mode,
    allUsers,
    onlineUserIds,
    selectedUser,
    onModeChange,
    onUserSelect,
    onLogout,
}: SidebarProps) {

    const otherUsers = allUsers.filter((user) => user._id !== username);
    return (
        <aside className="flex h-auto max-h-[45vh] w-full shrink-0 flex-col border-b border-slate-800 bg-slate-950 sm:max-h-[40vh] lg:h-screen lg:max-h-none lg:w-80 lg:border-b-0 lg:border-r">
            <div className="shrink-0 border-b border-slate-800 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg sm:h-11 sm:w-11">
                        💬
                    </div>

                    <div className="min-w-0">
                        <h1 className="truncate font-bold text-white">
                            Socket Chat
                        </h1>

                        <p className="flex items-center gap-1 text-xs text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Connected
                        </p>
                    </div>
                </div>
            </div>

            <div className="shrink-0 border-b border-slate-800 p-3 sm:p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white sm:h-10 sm:w-10">
                        {displayName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                            {displayName}
                        </p>

                        <p className="flex items-center gap-1 text-xs text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Online
                        </p>
                    </div>
                </div>
            </div>

            <nav className="shrink-0 p-3">
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Communication
                </p>

                <div className="flex gap-2 overflow-x-auto lg:flex-col">
                    {navigationItems.map((item) => (
                        <button
                            key={item.mode}
                            type="button"
                            onClick={() => onModeChange(item.mode)}
                            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition sm:py-3 lg:w-full ${mode === item.mode
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-300 hover:bg-slate-800"
                                }`}
                        >
                            <span>{item.icon}</span>
                            <span className="whitespace-nowrap">
                                {item.label}
                            </span>
                        </button>
                    ))}
                </div>
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                <p className="mb-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Online Users
                </p>

                {otherUsers.length === 0 ? (
                    <div className="rounded-xl bg-slate-900 px-3 py-4 text-center">
                        <p className="text-sm text-slate-500">
                            No other users found
                        </p>
                    </div>
                ) : (
                    <div className="flex gap-2 overflow-x-auto lg:flex-col">
                        {otherUsers.map((user) => {
                            const isOnline = onlineUserIds.includes(user._id);
                            const fullName = `${user.firstName} ${user.lastName}`;

                            return (
                                <button
                                    key={user._id}
                                    type="button"
                                    onClick={() => {
                                        onModeChange("private");
                                        onUserSelect(user._id);
                                    }}
                                    className={`flex min-w-[150px] shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition lg:w-full ${selectedUser === user._id
                                            ? "bg-slate-800"
                                            : "hover:bg-slate-900"
                                        }`}
                                >
                                    <div className="relative shrink-0">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
                                            {user.firstName.charAt(0).toUpperCase()}
                                        </div>

                                        <span
                                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${
                                                isOnline ? "bg-emerald-500" : "bg-slate-600"
                                            }`}
                                        />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-200">
                                            {fullName}
                                        </p>

                                        <p className={`text-xs ${isOnline ? "text-emerald-400" : "text-slate-500"}`}>
                                            {isOnline ? "Online" : "Offline"}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="shrink-0 border-t border-slate-800 p-3">
                <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 sm:py-3"
                >
                    <span>🚪</span>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}