import { useEffect, useRef, useState } from "react";
import { BookRentalUser } from "../utils/userApi";
import { createPrivateConversation } from "../utils/conversationApi";
import { setSelectedConversation } from "../store/navigationSlice";
import { useAppDispatch } from "../store/hooks";
import bookbuddylogo from "../assets/bookbuddylogo.png";
import { FiSearch, FiX, FiLogOut } from "react-icons/fi";
import { searchConversations, ConversationSearchResult } from "../utils/chatApi";

interface HeaderProps {
    displayName: string;
    allUsers: BookRentalUser[];
    currentUserId: string;
    onLogout: () => void;
}

export default function Header({
    displayName,
    allUsers,
    currentUserId,
    onLogout,
}: HeaderProps) {
    const dispatch = useAppDispatch();
    const [searchTerm, setSearchTerm] = useState("");
    const [showResults, setShowResults] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const searchWrapperRef = useRef<HTMLDivElement>(null);
    const profileWrapperRef = useRef<HTMLDivElement>(null);
    const [matchedConversations, setMatchedConversations] = useState<ConversationSearchResult[]>([]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                searchWrapperRef.current &&
                !searchWrapperRef.current.contains(e.target as Node)
            ) {
                setShowResults(false);
            }
            if (
                profileWrapperRef.current &&
                !profileWrapperRef.current.contains(e.target as Node)
            ) {
                setShowProfileMenu(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const term = searchTerm.trim();

        if (term.length === 0) {
            setMatchedConversations([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            try {
                const results = await searchConversations(currentUserId, term);
                setMatchedConversations(results);
            } catch (error) {
                console.error("Failed to search conversations:", error);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, currentUserId]);

    const filteredUsers =
        searchTerm.trim().length === 0
            ? []
            : allUsers.filter((user) => {
                  if (user._id === currentUserId) return false;
                  const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
                  return fullName.includes(searchTerm.trim().toLowerCase());
              });

    return (
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">

            {/* Left: app name */}
            <img
                src={bookbuddylogo}
                alt="BookBuddy"
                className="h-16 w-auto object-contain"
            />

            {/* Middle: search */}
            <div ref={searchWrapperRef} className="relative mx-4 w-full max-w-md">
                <div className="relative">
                    {searchTerm.trim().length > 0 ? (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm("");
                                setShowResults(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                        >
                            <FiX className="h-4 w-4" />
                        </button>
                    ) : (
                        <FiSearch className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    )}
                    <input
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => setShowResults(true)}
                        placeholder="Search friends..."
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-4 pr-10 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500"
                    />
                </div>

                {showResults && searchTerm.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                        {filteredUsers.length === 0 && matchedConversations.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-slate-500">
                                No results found
                            </p>
                        ) : (
                            filteredUsers.map((user) => (
                                <button
                                    key={user._id}
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const conversation =
                                                await createPrivateConversation(
                                                    currentUserId,
                                                    user._id
                                                );

                                            dispatch(
                                                setSelectedConversation({
                                                    userId: user._id,
                                                    conversationId: conversation._id,
                                                })
                                            );
                                        } catch (error) {
                                            console.error(
                                                "Failed to start conversation:",
                                                error
                                            );
                                        }

                                        setSearchTerm("");
                                        setShowResults(false);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-blue-50"
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
                                        {user.firstName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="truncate text-sm font-medium text-blue-600">
                                        {user.firstName} {user.lastName}
                                    </span>
                                    
                                </button>
                            ))
                        )}
                        {matchedConversations.length > 0 && (
                            <>
                                <p className="px-4 pt-2 text-xs font-semibold uppercase text-slate-400">
                                    Chats
                                </p>
                                {matchedConversations.map(({ conversationId, otherUserId, matchedText }) => {
                                    const user = allUsers.find((u) => u._id === otherUserId);
                                    if (!user) return null;

                                    return (
                                        <button
                                            key={conversationId}
                                            type="button"
                                            onClick={() => {
                                                dispatch(
                                                    setSelectedConversation({
                                                        userId: user._id,
                                                        conversationId,
                                                    })
                                                );
                                                setSearchTerm("");
                                                setShowResults(false);
                                            }}
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-blue-50"
                                        >
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-600">
                                                {user.firstName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="truncate text-sm font-medium text-emerald-600">
                                                {user.firstName} {user.lastName}
                                            </span>
                                            <span className="truncate text-xs text-slate-400">
                                                {matchedText}
                                            </span>
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Right: profile icon -> logout */}
            <div ref={profileWrapperRef} className="relative">
                <button
                    type="button"
                    onClick={() => setShowProfileMenu((prev) => !prev)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white"
                >
                    {displayName.charAt(0).toUpperCase()}
                </button>

                {showProfileMenu && (
                    <div className="absolute right-0 top-full z-10 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                        <button
                            type="button"
                            onClick={onLogout}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-600"
                        >
                            <FiLogOut className="h-4 w-4 text-red-500" />
                            <span>Logout</span>
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}