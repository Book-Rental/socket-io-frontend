// import { useMemo } from "react";
// import Rooms from "../components/Rooms";
// import { useAllUsers } from "../hooks/queries/useAllUsers";
// import { useAppSelector } from "../store/hooks";

// export default function RoomsPage() {
//     const currentUser = useAppSelector((state) => state.auth.currentUser);
//     const { data: allUsers = [], } = useAllUsers(Boolean(currentUser));
//     const usersById = useMemo(() => {
//         const map: Record< string,(typeof allUsers)[number] > = {};
//         allUsers.forEach((user) => {
//             map[user._id] = user;
//         });
//         return map;
//     }, [allUsers]);

//     if (!currentUser) {
//         return null;
//     }

//     return (
//         <Rooms
//             username={currentUser.id}
//             usersById={usersById}
//         />
//     );
// }