import { useMemo, useState } from "react";

import Sidebar from "./components/Sidebar";
import OneToOne from "./components/OneToOne";
import Broadcast from "./components/Broadcast";
import Rooms from "./components/Rooms";
import GroupChat from "./components/GroupChat";

import Login from "./Pages/Login";

import { ChatMode } from "./utils/types";
import { useAuth } from "./hooks/useAuth";
import { useSocket } from "./hooks/useSocket";
import { useAllUsers } from "./hooks/queries/useAllUsers";

export default function App() {
  const { currentUser, handleLogin, handleLogout } = useAuth();
  const { onlineUsers: onlineUserIds } = useSocket(); 
  const { data: allUsers = [] } = useAllUsers();

  const usersById = useMemo(() => {
      const map: Record<string, typeof allUsers[number]> = {};
      allUsers.forEach((u) => { map[u._id] = u; });
      return map;
  }, [allUsers]);

  const [mode, setMode] = useState<ChatMode>("private");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <>
        <Login onLogin={handleLogin} />
      </>
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
        onModeChange={setMode}
        onUserSelect={setSelectedUser}
        onLogout={handleLogout}
    />

      <main className="min-h-0 min-w-0 flex-1">
        {mode === "private" && (
            <OneToOne
                username={currentUser.id}
                selectedUser={selectedUser}
                usersById={usersById}
                onlineUserIds={onlineUserIds}
            />
        )}
        {mode === "broadcast" && (
            <Broadcast username={currentUser.id} usersById={usersById} />
        )}
        {mode === "rooms" && (
            <Rooms username={currentUser.id} usersById={usersById} />
        )}
        {mode === "group" && (
            <GroupChat username={currentUser.id} onlineUsers={onlineUserIds} usersById={usersById} />
        )}
      </main>
    </div>
  );
}