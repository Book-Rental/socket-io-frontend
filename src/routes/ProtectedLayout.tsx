import { useEffect } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import PrivateChat from "../Pages/PrivateChat";
import { useAllUsers } from "../hooks/queries/useAllUsers";
import { useUserConversations } from "../hooks/queries/useUserConversations";
import { useSocket } from "../hooks/useSocket";
import { logoutUser } from "../store/authSlice";
import { setSelectedConversation, resetNavigation } from "../store/navigationSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { socket } from "../socket";
import { useQueryClient } from "@tanstack/react-query";
import IncomingCallModal from "../components/IncomingCallModal";
import VideoCall from "../components/OneToOne/VideoCall";
import { useCall } from "../components/contexts/useCall";
import { CallProvider } from "../components/contexts/CallContext";

function ProtectedLayoutInner() {
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();

    const currentUser = useAppSelector((state) => state.auth.currentUser);
    const { selectedConversationId } = useAppSelector((state) => state.navigation);

    const { data: allUsers = [] } = useAllUsers(Boolean(currentUser));
    const { onlineUsers: onlineUserIds } = useSocket();

    const { data: conversations = [], isLoading: isConversationsLoading } =
        useUserConversations(currentUser?.id ?? null);

    const usersById = allUsers.reduce<Record<string, (typeof allUsers)[number]>>(
        (map, user) => {
            map[user._id] = user;
            return map;
        },
        {}
    );

    const call = useCall();

    useEffect(() => {
        if (!currentUser) return;

        const handleConversationUpdated = () => {
            queryClient.invalidateQueries({ queryKey: ["userConversations", currentUser.id] });
        };

        socket.on("conversationUpdated", handleConversationUpdated);
        return () => {
            socket.off("conversationUpdated", handleConversationUpdated);
        };
    }, [currentUser, queryClient]);

    if (!currentUser) return null;

    const handleLogout = async () => {
        dispatch(resetNavigation());
        queryClient.clear();
        await dispatch(logoutUser());
    };

    const remoteUserName = call.remoteUserId
        ? `${usersById[call.remoteUserId]?.firstName ?? ""} ${usersById[call.remoteUserId]?.lastName ?? ""}`.trim() ||
        call.remoteUserId
        : "";

    const callerName = call.incomingCall
        ? `${usersById[call.incomingCall.from]?.firstName ?? ""} ${usersById[call.incomingCall.from]?.lastName ?? ""}`.trim() ||
        call.incomingCall.from
        : "";

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

            {/* Global call UI — renders regardless of which screen/conversation is open */}
            {call.callStatus === "ringing" && call.incomingCall && (
                <IncomingCallModal
                    callerName={callerName}
                    callType={call.incomingCall.callType}
                    onAccept={call.acceptCall}
                    onReject={call.rejectCall}
                />
            )}

            {(call.callStatus === "calling" || call.callStatus === "connected" || call.callStatus === "ended") && (
                <VideoCall
                    callStatus={call.callStatus}
                    callType={call.callType}
                    localStream={call.localStream}
                    remoteStream={call.remoteStream}
                    isMuted={call.isMuted}
                    isCameraOff={call.isCameraOff}
                    remoteUserName={remoteUserName}
                    callError={call.callError}
                    onToggleMute={call.toggleMute}
                    onToggleCamera={call.toggleCamera}
                    onEndCall={call.endCall}
                />
            )}
        </div>
    );
}

export default function ProtectedLayout() {
    return (
        <CallProvider>
            <ProtectedLayoutInner />
        </CallProvider>
    );
}