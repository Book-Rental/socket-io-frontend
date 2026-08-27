import {
  useEffect,
  useState,
} from "react";

import Sidebar from "./components/Sidebar";
import OneToOne from "./components/OneToOne";
import Broadcast from "./components/Broadcast";
import Rooms from "./components/Rooms";

import {
  getCurrentUser,
  logoutUser,
} from "./api";

import { socket } from "./socket";
import { ChatMode } from "./utils/types";
import Register from "./Pages/Register";
import Login from "./Pages/Login";
import GroupChat from "./components/GroupChat";

export default function App() {

  const [username, setUsername] =
    useState<string | null>(
      getCurrentUser()
    );

  const [showRegister, setShowRegister] =
    useState(false);

  const [mode, setMode] =
    useState<ChatMode>("private");

  const [onlineUsers, setOnlineUsers] =
    useState<string[]>([]);

  const [selectedUser, setSelectedUser] =
    useState<string | null>(null);


  /*
   * SOCKET CONNECTION
   */
  useEffect(() => {

    if (!username) {
      return;
    }

    /*
     * Receive online users
     */
    const handleOnlineUsers = (
      users: string[]
    ) => {

      console.log(
        "Online users:",
        users
      );

      setOnlineUsers(users);
    };


    /*
     * Socket connected
     */
    const handleConnect = () => {

      console.log(
        "Socket connected:",
        socket.id
      );

      /*
       * Register ONLY after socket
       * is actually connected.
       */
      socket.emit(
        "registerUser",
        username
      );
    };


    /*
     * Socket disconnected
     */
    const handleDisconnect = (
      reason: string
    ) => {

      console.log(
        "Socket disconnected:",
        reason
      );
    };


    /*
     * Socket connection error
     */
    const handleConnectError = (
      error: Error
    ) => {

      console.error(
        "Socket connection error:",
        error.message
      );
    };


    /*
     * Register listeners BEFORE connect
     */
    socket.on(
      "onlineUsers",
      handleOnlineUsers
    );

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "connect_error",
      handleConnectError
    );


    /*
     * Connect
     */
    if (!socket.connected) {

      socket.connect();

    } else {

      /*
       * If already connected,
       * register immediately.
       */
      socket.emit(
        "registerUser",
        username
      );
    }


    /*
     * CLEANUP
     */
    return () => {

      socket.off(
        "onlineUsers",
        handleOnlineUsers
      );

      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "connect_error",
        handleConnectError
      );

    };

  }, [username]);


  /*
   * LOGIN
   */
  const handleLogin = (
    user: string
  ) => {

    setUsername(user);

    setShowRegister(false);
  };


  /*
   * LOGOUT
   */
  const handleLogout = () => {

    console.log(
      "Logging out:",
      username
    );

    socket.disconnect();

    logoutUser();

    setUsername(null);

    setSelectedUser(null);

    setOnlineUsers([]);
  };


  /*
   * REGISTER
   */
  if (!username) {

    if (showRegister) {

      return (
        <Register
          onRegistered={() =>
            setShowRegister(false)
          }
          onLogin={() =>
            setShowRegister(false)
          }
        />
      );

    }


    return (
      <Login
        onLogin={handleLogin}
        onRegister={() =>
          setShowRegister(true)
        }
      />
    );
  }


  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">

      <Sidebar
        username={username}
        mode={mode}
        onlineUsers={onlineUsers}
        selectedUser={selectedUser}
        onModeChange={setMode}
        onUserSelect={setSelectedUser}
        onLogout={handleLogout}
      />


      <main className="min-w-0 flex-1">

        {mode === "private" && (

          <OneToOne
            username={username}
            selectedUser={selectedUser}
          />

        )}


        {mode === "broadcast" && (

          <Broadcast
            username={username}
          />

        )}


        {mode === "rooms" && (

          <Rooms
            username={username}
          />

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