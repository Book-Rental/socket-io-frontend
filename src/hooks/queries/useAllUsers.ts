import { useQuery } from "@tanstack/react-query";
import { fetchAllUsers } from "../../utils/userApi";

export function useAllUsers() {
    return useQuery({
        queryKey: ["allUsers"],
        queryFn: fetchAllUsers,
        staleTime: 5 * 60 * 1000,
    });
}