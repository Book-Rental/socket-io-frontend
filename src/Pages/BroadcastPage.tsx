import { useMemo } from "react";

import Broadcast from "../components/Broadcast";

import { useAllUsers } from "../hooks/queries/useAllUsers";
import { useAuth } from "../context/AuthContext";

export default function BroadcastPage() {

    const {
        currentUser,
    } = useAuth();

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
        <Broadcast
            username={currentUser.id}
            usersById={usersById}
        />
    );
}