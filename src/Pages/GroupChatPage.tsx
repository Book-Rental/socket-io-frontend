import { useMemo } from "react";

import GroupChat from "../components/GroupChat";

import { useSocket } from "../hooks/useSocket";
import { useAllUsers } from "../hooks/queries/useAllUsers";
import { useAuth } from "../context/AuthContext";

export default function GroupChatPage() {

    const {
        currentUser,
    } = useAuth();

    const {
        onlineUsers,
    } = useSocket();

    const {
        data: allUsers = [],
    } = useAllUsers(Boolean(currentUser));


    const usersById = useMemo(() => {

        const map: Record<
            string,
            (typeof allUsers)[number]
        > = {};

        allUsers.forEach((user) => {
            map[user._id] = user;
        });

        return map;

    }, [allUsers]);


    if (!currentUser) {
        return null;
    }


    return (
        <GroupChat
            username={currentUser.id}
            onlineUsers={onlineUsers}
            usersById={usersById}
        />
    );
}