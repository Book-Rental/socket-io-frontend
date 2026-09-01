import { useQuery } from "@tanstack/react-query";
import { fetchAllUsers } from "../../utils/userApi";

export function useAllUsers(enabled: boolean) {
    return useQuery({
        queryKey: ["allUsers"],
        queryFn: fetchAllUsers,
        staleTime: 5 * 60 * 1000,
        enabled,
    });
}