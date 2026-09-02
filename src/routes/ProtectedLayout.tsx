// import Sidebar from "../components/Sidebar";
// import PrivateChat from "../Pages/PrivateChat";
// import BroadcastPage from "../Pages/BroadcastPage";
// import RoomsPage from "../Pages/RoomsPage";
// import GroupChatPage from "../Pages/GroupChatPage";
// import { useSocket } from "../hooks/useSocket";
// import { useAllUsers } from "../hooks/queries/useAllUsers";
// import { setMode, setSelectedUser } from "../store/navigationSlice";
// import { logoutUser } from "../store/authSlice";
// import { useAppDispatch, useAppSelector } from "../store/hooks";
// import { ChatMode } from "../utils/types";


// export default function ProtectedLayout() {
//    const dispatch = useAppDispatch();
//     const currentUser = useAppSelector((state) => state.auth.currentUser);
//     const { mode, selectedUserId: selectedUser } = useAppSelector( (state) => state.navigation );
//     const { onlineUsers: onlineUserIds, } = useSocket();
//     const { data: allUsers = [], } = useAllUsers(Boolean(currentUser));

//      if (!currentUser) {
//         return null;
//     }

//     const handleModeChange = (nextMode: ChatMode) => {
//         dispatch(setMode(nextMode));
//     };

//     const handleUserSelect = (userId: string) => {
//         dispatch(setSelectedUser(userId));
//         dispatch(setMode("private"));
//     };

//     return (
//         <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-900 lg:flex-row">

//             <Sidebar
//                 username={currentUser.id}
//                 displayName={`${currentUser.firstName} ${currentUser.lastName}`}
//                 mode={mode}
//                 allUsers={allUsers}
//                 onlineUserIds={onlineUserIds}
//                 selectedUser={selectedUser}
//                 onModeChange={handleModeChange}
//                 onUserSelect={handleUserSelect}
//                 onLogout={() => dispatch(logoutUser())}
//             />

//             <main className="min-h-0 min-w-0 flex-1">
//                 {mode === "private" && <PrivateChat />}
//                 {mode === "broadcast" && <BroadcastPage />}
//                 {mode === "rooms" && <RoomsPage />}
//                 {mode === "group" && <GroupChatPage />}
//             </main>

//         </div>
//     );
// }


import { useEffect } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import PrivateChat from "../Pages/PrivateChat";
import { useAllUsers } from "../hooks/queries/useAllUsers";
import { useUserConversations } from "../hooks/queries/useUserConversations";
import { useSocket } from "../hooks/useSocket";
import { logoutUser } from "../store/authSlice";
import { setSelectedConversation } from "../store/navigationSlice";
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

    const { data: conversations = [] } = useUserConversations(
        currentUser?.id ?? null
    );

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

    return (
        <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-900">

            <Header
                displayName={`${currentUser.firstName} ${currentUser.lastName}`}
                allUsers={allUsers}
                currentUserId={currentUser.id}
                onLogout={() => dispatch(logoutUser())}
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
                />

                <main className="min-h-0 min-w-0 flex-1">
                    <PrivateChat />
                </main>
            </div>

        </div>
    );
}