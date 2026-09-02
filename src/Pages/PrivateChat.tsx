import OneToOne from "../components/OneToOne";
import { useSocket } from "../hooks/useSocket";
import { useAllUsers } from "../hooks/queries/useAllUsers";
import { useAppSelector } from "../store/hooks";

export default function PrivateChat() {
    const currentUser = useAppSelector((state) => state.auth.currentUser);
    const { selectedUserId, selectedConversationId } = useAppSelector(
        (state) => state.navigation
    );
    const { onlineUsers } = useSocket();
    const { data: allUsers = [] } = useAllUsers(Boolean(currentUser));

    const usersById = allUsers.reduce<Record<string, (typeof allUsers)[number]>>(
        (map, user) => {
            map[user._id] = user;
            return map;
        },
        {}
    );

    if (!currentUser) {
        return null;
    }

    return (
        <OneToOne
            username={currentUser.id}
            selectedUser={selectedUserId}
            selectedConversationId={selectedConversationId}
            usersById={usersById}
            onlineUserIds={onlineUsers}
        />
    );
}