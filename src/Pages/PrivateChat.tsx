import { useMemo } from "react";
import { useParams } from "react-router-dom";

import OneToOne from "../components/OneToOne";

import { useSocket } from "../hooks/useSocket";
import { useAllUsers } from "../hooks/queries/useAllUsers";
import { useAuth } from "../context/AuthContext";

export default function PrivateChat() {

    const { userId } = useParams<{
        userId: string;
    }>();

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
        <OneToOne
            username={currentUser.id}
            selectedUser={userId ?? null}
            usersById={usersById}
            onlineUserIds={onlineUsers}
        />
    );
}