import { useMemo } from "react";
import {
    Navigate,
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import Sidebar from "../components/Sidebar";

import { useSocket } from "../hooks/useSocket";
import { useAllUsers } from "../hooks/queries/useAllUsers";

import { ChatMode } from "../utils/types";
import { useAuth } from "../context/AuthContext";

export default function ProtectedLayout() {
    const { currentUser, handleLogout } = useAuth();

    const {
        onlineUsers: onlineUserIds,
    } = useSocket();

    const {
        data: allUsers = [],
    } = useAllUsers(Boolean(currentUser));

    const navigate = useNavigate();
    const location = useLocation();

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


    /*
     * Determine active navigation mode.
     */
    const getMode = (): ChatMode => {
        if (location.pathname.startsWith("/broadcast")) {
            return "broadcast";
        }

        if (location.pathname.startsWith("/rooms")) {
            return "rooms";
        }

        if (location.pathname.startsWith("/group")) {
            return "group";
        }

        return "private";
    };

    const mode = getMode();


    /*
     * Determine selected private user.
     *
     * /chat/12345
     */
    const selectedUser =
        location.pathname.startsWith("/chat/")
            ? location.pathname.split("/")[2] || null
            : null;


    /*
     * Sidebar navigation.
     */
    const handleModeChange = (
        nextMode: ChatMode
    ) => {
        switch (nextMode) {
            case "private":
                navigate("/chat");
                break;

            case "broadcast":
                navigate("/broadcast");
                break;

            case "rooms":
                navigate("/rooms");
                break;

            case "group":
                navigate("/group");
                break;
        }
    };


    /*
     * User selected from sidebar.
     */
    const handleUserSelect = (
        userId: string
    ) => {
        navigate(`/chat/${userId}`);
    };


    /*
     * Conditional return AFTER all hooks.
     */
    if (!currentUser) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }


    return (
        <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-900 lg:flex-row">

            <Sidebar
                username={currentUser.id}
                displayName={`${currentUser.firstName} ${currentUser.lastName}`}
                mode={mode}
                allUsers={allUsers}
                onlineUserIds={onlineUserIds}
                selectedUser={selectedUser}
                onModeChange={handleModeChange}
                onUserSelect={handleUserSelect}
                onLogout={handleLogout}
            />

            <main className="min-h-0 min-w-0 flex-1">
                <Outlet
                    context={{
                        currentUser,
                        onlineUserIds,
                        allUsers,
                        usersById,
                        selectedUser,
                    }}
                />
            </main>

        </div>
    );
}