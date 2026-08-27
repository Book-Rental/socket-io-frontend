import { ChatMode } from "../utils/types";

interface SidebarProps {
    username: string;
    mode: ChatMode;
    onlineUsers: string[];
    selectedUser: string | null;
    onModeChange: (mode: ChatMode) => void;
    onUserSelect: (user: string) => void;
    onLogout: () => void;
}

export default function Sidebar({
    username,
    mode,
    onlineUsers,
    selectedUser,
    onModeChange,
    onUserSelect,
    onLogout,
}: SidebarProps) {

    return (
        <aside className="flex h-screen w-80 shrink-0 flex-col border-r border-slate-800 bg-slate-950">

            {/* HEADER */}

            <div className="border-b border-slate-800 p-5">

                <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600">
                        💬
                    </div>

                    <div>
                        <h1 className="font-bold text-white">
                            Socket Chat
                        </h1>

                        <p className="text-xs text-emerald-400">
                            ● Connected
                        </p>
                    </div>

                </div>

            </div>


            {/* USER */}

            <div className="border-b border-slate-800 p-4">

                <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 font-bold text-white">
                        {username
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div className="min-w-0">

                        <p className="truncate font-medium text-white">
                            {username}
                        </p>

                        <p className="text-xs text-emerald-400">
                            Online
                        </p>

                    </div>

                </div>

            </div>


            {/* NAVIGATION */}

            <div className="p-3">

                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Communication
                </p>


                <button
                    onClick={() =>
                        onModeChange("private")
                    }
                    className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${mode === "private"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                        }`}
                >
                    <span>👤</span>
                    One-to-One
                </button>


                <button
                    onClick={() =>
                        onModeChange("broadcast")
                    }
                    className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${mode === "broadcast"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                        }`}
                >
                    <span>📢</span>
                    Broadcast
                </button>


                <button
                    onClick={() =>
                        onModeChange("rooms")
                    }
                    className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${mode === "rooms"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                        }`}
                >
                    <span>🏠</span>
                    Rooms
                </button>
                <button
                    onClick={() =>
                        onModeChange("group")
                    }
                    className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${mode === "group"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-300 hover:bg-slate-800"
                        }`}
                >
                    <span>👥</span>
                    One-to-Many
                </button>

            </div>


            {/* ONLINE USERS */}

            <div className="min-h-0 flex-1 overflow-y-auto px-3">

                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Online Users
                </p>


                {onlineUsers
                    .filter(
                        (user) => user !== username
                    )
                    .map((user) => (

                        <button
                            key={user}
                            onClick={() => {
                                onModeChange("private");
                                onUserSelect(user);
                            }}
                            className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selectedUser === user
                                ? "bg-slate-800"
                                : "hover:bg-slate-900"
                                }`}
                        >

                            <div className="relative">

                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
                                    {user
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>

                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-500" />

                            </div>


                            <div className="min-w-0">

                                <p className="truncate text-sm font-medium text-slate-200">
                                    {user}
                                </p>

                                <p className="text-xs text-emerald-400">
                                    Online
                                </p>

                            </div>

                        </button>

                    ))}

            </div>


            {/* LOGOUT */}

            <div className="border-t border-slate-800 p-3">

                <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                >
                    🚪
                    Logout
                </button>

            </div>

        </aside>
    );
}