// import { FormEvent, useEffect, useState } from "react";
// import { useQueryClient } from "@tanstack/react-query";
// import { socket } from "../socket";
// import { Message } from "../utils/types";
// import { useGroupHistory } from "../hooks/queries/useGroupHistory";
// import { showToast } from "../utils/showToaster";
// import { BookRentalUser } from "../utils/userApi";
// import EmojiPickerButton from "./EmojiPickerButton";

// interface GroupChatProps {
//     username: string;
//     onlineUsers: string[];
//     usersById: Record<string, BookRentalUser>;
// }

// export default function GroupChat({
//     username,
//     onlineUsers,
//     usersById,
// }: GroupChatProps) {
//     const [message, setMessage] = useState("");

//     const queryClient = useQueryClient();

//     const {
//         data: messages = [],
//         isLoading,
//         isError,
//     } = useGroupHistory(username);

//     useEffect(() => {
//         const handleGroupMessage = (newMessage: Message) => {
//             queryClient.setQueryData<Message[]>(
//                 ["groupMessages", username],
//                 (previousMessages = []) => {
//                     const alreadyExists = previousMessages.some(
//                         (msg) => msg.id === newMessage.id
//                     );

//                     if (alreadyExists) {
//                         return previousMessages;
//                     }

//                     return [...previousMessages, newMessage].sort(
//                         (a, b) => a.timestamp - b.timestamp
//                     );
//                 }
//             );
//         };

//         socket.on("receiveGroupMessage", handleGroupMessage);

//         return () => {
//             socket.off("receiveGroupMessage", handleGroupMessage);
//         };
//     }, [queryClient, username]);

//     const sendMessage = (e: FormEvent<HTMLFormElement>) => {
//         e.preventDefault();

//         const trimmedMessage = message.trim();

//         if (!trimmedMessage) {
//             return;
//         }

//         if (!socket.connected) {
//             showToast(
//                 "You're offline. Reconnecting...",
//                 "error"
//             );
//             return;
//         }

//         const recipients = onlineUsers.filter(
//             (user) => user !== username
//         );

//         if (recipients.length === 0) {
//             showToast("No other users online to message", "error");
//             return;
//         }

//         socket.emit("sendGroupMessage", {
//             recipients,
//             content: trimmedMessage,
//         });

//         setMessage("");
//     };

//     const otherOnlineUsers = onlineUsers.filter(
//         (user) => user !== username
//     );

//     return (
//         <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-900 lg:flex-row">
//             <aside className="shrink-0 border-b border-slate-800 bg-slate-900 lg:w-72 lg:border-b-0 lg:border-r">
//                 <div className="p-4 sm:p-5">
//                     <div className="flex items-center gap-3">
//                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-lg">
//                             👥
//                         </div>

//                         <div className="min-w-0">
//                             <h2 className="text-base font-semibold text-white">
//                                 Group Chat
//                             </h2>

//                             <p className="text-xs text-slate-500 sm:text-sm">
//                                 Message online users
//                             </p>
//                         </div>
//                     </div>

//                     <div className="mt-4 rounded-xl bg-slate-800 p-3">
//                         <div className="flex items-center justify-between">
//                             <p className="text-xs uppercase tracking-wide text-slate-500">
//                                 Online Users
//                             </p>

//                             <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
//                                 {onlineUsers.length}
//                             </span>
//                         </div>
//                     </div>

//                     <div className="mt-4 max-h-40 overflow-y-auto lg:max-h-[calc(100vh-190px)]">
//                         {otherOnlineUsers.length === 0 ? (
//                             <p className="py-4 text-center text-sm text-slate-500">
//                                 No other users online
//                             </p>
//                         ) : (
//                             <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible">
//                                 {otherOnlineUsers.map((user) => {
//                                     const name = `${usersById[user]?.firstName ?? ""} ${usersById[user]?.lastName ?? ""}`.trim() || user;
//                                     return (
//                                         <div
//                                             key={user}
//                                             className="flex min-w-[160px] shrink-0 items-center gap-3 rounded-xl bg-slate-800 px-3 py-3 lg:min-w-0"
//                                         >
//                                             <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
//                                                 {name.charAt(0).toUpperCase()}
//                                                 <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-800 bg-emerald-400" />
//                                             </div>
//                                             <div className="min-w-0 flex-1">
//                                                 <p className="truncate text-sm font-medium text-slate-300">
//                                                     {name}
//                                                 </p>
//                                                 <p className="text-xs text-emerald-400">
//                                                     Online
//                                                 </p>
//                                             </div>
//                                         </div>
//                                     );
//                                 })}
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </aside>

//             <section className="flex min-h-0 min-w-0 flex-1 flex-col">
//                 <header className="shrink-0 border-b border-slate-800 px-4 py-4 sm:px-6 sm:py-5">
//                     <div className="flex items-center gap-3">
//                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-lg sm:h-11 sm:w-11">
//                             👥
//                         </div>

//                         <div className="min-w-0">
//                             <h2 className="truncate text-base font-semibold text-white sm:text-lg">
//                                 Group Messages
//                             </h2>

//                             <p className="truncate text-xs text-slate-400 sm:text-sm">
//                                 Messages are delivered to the group
//                             </p>
//                         </div>
//                     </div>
//                 </header>

//                 <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
//                     {isLoading && (
//                         <div className="flex h-full items-center justify-center">
//                             <div className="text-center">
//                                 <div className="mb-3 text-4xl">
//                                     👥
//                                 </div>

//                                 <p className="text-sm text-slate-400">
//                                     Loading group messages...
//                                 </p>
//                             </div>
//                         </div>
//                     )}

//                     {isError && !isLoading && (
//                         <div className="flex h-full items-center justify-center px-4">
//                             <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center sm:p-6">
//                                 <div className="mb-3 text-4xl">
//                                     ⚠️
//                                 </div>

//                                 <h3 className="font-semibold text-red-400">
//                                     Failed to load messages
//                                 </h3>

//                                 <p className="mt-2 text-sm text-slate-400">
//                                     Please try again later.
//                                 </p>
//                             </div>
//                         </div>
//                     )}

//                     {!isLoading &&
//                         !isError &&
//                         messages.length === 0 && (
//                             <div className="flex h-full items-center justify-center px-4">
//                                 <div className="text-center">
//                                     <div className="mb-4 text-5xl">
//                                         👥
//                                     </div>

//                                     <h3 className="text-base font-semibold text-slate-300 sm:text-lg">
//                                         Group Messaging
//                                     </h3>

//                                     <p className="mt-2 text-xs text-slate-500 sm:text-sm">
//                                         Send a message to the group
//                                     </p>
//                                 </div>
//                             </div>
//                         )}

//                     {!isLoading &&
//                         !isError &&
//                         messages.length > 0 && (
//                             <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4">
//                                 {messages.map((msg) => {
//                                     const mine = msg.from === username;

//                                     return (
//                                         <div
//                                             key={msg.id}
//                                             className={`flex w-full ${mine
//                                                 ? "justify-end"
//                                                 : "justify-start"
//                                                 }`}
//                                         >
//                                             <div
//                                                 className={`w-fit max-w-[90%] rounded-2xl px-3 py-3 sm:max-w-[75%] sm:px-4 sm:py-3 ${mine
//                                                     ? "bg-indigo-600 text-white"
//                                                     : "bg-slate-800 text-slate-200"
//                                                     }`}
//                                             >
//                                                 <p className="text-xs font-semibold opacity-70">
//                                                     {mine ? "You" : `${usersById[msg.from]?.firstName ?? ""} ${usersById[msg.from]?.lastName ?? ""}`.trim() || msg.from}
//                                                 </p>

//                                                 <p className="mt-1 break-words text-sm leading-6">
//                                                     {msg.content}
//                                                 </p>

//                                                 <p className="mt-1 text-[10px] opacity-50 sm:text-xs">
//                                                     {new Date(
//                                                         msg.timestamp
//                                                     ).toLocaleTimeString(
//                                                         [],
//                                                         {
//                                                             hour: "2-digit",
//                                                             minute: "2-digit",
//                                                         }
//                                                     )}
//                                                 </p>
//                                             </div>
//                                         </div>
//                                     );
//                                 })}
//                             </div>
//                         )}
//                 </div>

//                 <form
//                     onSubmit={sendMessage}
//                     className="shrink-0 border-t border-slate-800 bg-slate-900 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
//                 >
//                     <div className="mx-auto flex w-full max-w-4xl items-center gap-2 sm:gap-3">
//                         <input
//                             value={message}
//                             onChange={(e) => setMessage(e.target.value)}
//                             placeholder="Type a group message..."
//                             className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 sm:px-4"
//                         />

//                         <EmojiPickerButton
//                             onEmojiSelect={(emoji) =>
//                                 setMessage((previous) => previous + emoji)
//                             }
//                         />

//                         <button
//                             type="submit"
//                             disabled={
//                                 !message.trim() ||
//                                 !socket.connected ||
//                                 otherOnlineUsers.length === 0
//                             }
//                             className="shrink-0 rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
//                         >
//                             <span className="sm:hidden">
//                                 ➤
//                             </span>

//                             <span className="hidden sm:inline">
//                                 Send
//                             </span>
//                         </button>
//                     </div>
//                 </form>
//             </section>
//         </div>
//     );
// }