import { useEffect } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import PrivateChat from "../Pages/PrivateChat";
import { useAllUsers } from "../hooks/queries/useAllUsers";
import { useUserConversations } from "../hooks/queries/useUserConversations";
import { useSocket } from "../hooks/useSocket";
import { logoutUser } from "../store/authSlice";
import { setSelectedConversation, resetNavigation, } from "../store/navigationSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { socket } from "../socket";
import { useQueryClient } from "@tanstack/react-query";


export default function ProtectedLayout() {
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();

    const currentUser = useAppSelector((state) => state.auth.currentUser);
    const { selectedConversationId } = useAppSelector((state) => state.navigation);

    const { data: allUsers = [] } = useAllUsers(Boolean(currentUser));
    const { onlineUsers: onlineUserIds } = useSocket();

    const {
        data: conversations = [],
        isLoading: isConversationsLoading,
    } = useUserConversations(currentUser?.id ?? null);

    const usersById = allUsers.reduce<Record<string, (typeof allUsers)[number]>>(
        (map, user) => {
            map[user._id] = user;
            return map;
        },
        {}
    );

    // Keep the sidebar's conversation list live: refetch whenever the
    // backend tells us any conversation changed (new message sent/received).
    useEffect(() => {
        if (!currentUser) return;

        const handleConversationUpdated = () => {
            queryClient.invalidateQueries({
                queryKey: ["userConversations", currentUser.id],
            });
        };

        socket.on("conversationUpdated", handleConversationUpdated);
        return () => {
            socket.off("conversationUpdated", handleConversationUpdated);
        };
    }, [currentUser, queryClient]);

    if (!currentUser) {
        return null;
    }

    const handleLogout = async () => {
        dispatch(resetNavigation());
        queryClient.clear();

        await dispatch(logoutUser());
    };

    return (
        <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-900">

            <Header
                displayName={`${currentUser.firstName} ${currentUser.lastName}`}
                allUsers={allUsers}
                currentUserId={currentUser.id}
                onLogout={handleLogout}
            />

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
                <Sidebar
                    currentUserId={currentUser.id}
                    conversations={conversations}
                    usersById={usersById}
                    onlineUserIds={onlineUserIds}
                    selectedConversationId={selectedConversationId}
                    onConversationSelect={(userId, conversationId) =>
                        dispatch(setSelectedConversation({ userId, conversationId }))
                    }
                    isLoading={isConversationsLoading}
                />

                <main className="min-h-0 min-w-0 flex-1">
                    <PrivateChat />
                </main>
            </div>

        </div>
    );
}