import { useQuery } from "@tanstack/react-query";
import { fetchUserConversations } from "../../utils/chatApi";

export function useUserConversations(userId: string | null) {
    return useQuery({
        queryKey: ["userConversations", userId],
        queryFn: () => fetchUserConversations(userId!),
        enabled: Boolean(userId),
        staleTime: 10 * 1000,
    });
}