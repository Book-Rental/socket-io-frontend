import { io } from "socket.io-client";

const socket = io("https://socket-chat-backend-uowl.onrender.com");

export default socket;