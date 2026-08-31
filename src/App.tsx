import { useState } from "react";

import Sidebar from "./components/Sidebar";
import OneToOne from "./components/OneToOne";
import Broadcast from "./components/Broadcast";
import Rooms from "./components/Rooms";
import GroupChat from "./components/GroupChat";

import Login from "./Pages/Login";

import { ChatMode } from "./utils/types";
import { useAuth } from "./hooks/useAuth";
import { useSocket } from "./hooks/useSocket";

export default function App() {
  const {
    username,
    handleLogin,
    handleLogout,
  } = useAuth();

  const { onlineUsers } = useSocket();

  const [mode, setMode] = useState<ChatMode>("private");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  if (!username) {
    return (
      <>
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-900 lg:flex-row">

      <Sidebar
        username={username}
        mode={mode}
        onlineUsers={onlineUsers}
        selectedUser={selectedUser}
        onModeChange={setMode}
        onUserSelect={setSelectedUser}
        onLogout={handleLogout}
      />

      <main className="min-h-0 min-w-0 flex-1">
        {mode === "private" && (
          <OneToOne
            username={username}
            selectedUser={selectedUser}
          />
        )}

        {mode === "broadcast" && (
          <Broadcast username={username} />
        )}

        {mode === "rooms" && (
          <Rooms username={username} />
        )}

        {mode === "group" && (
          <GroupChat
            username={username}
            onlineUsers={onlineUsers}
          />
        )}
      </main>
    </div>
  );
}