import { useQuery } from "@tanstack/react-query";
import { fetchConversationHistory } from "../../utils/chatApi";

export function useConversationHistory(
    conversationId: string | null,
    userId?: string
) {
    return useQuery({
        queryKey: ["conversationMessages", conversationId],
        queryFn: () => fetchConversationHistory(conversationId!, userId),
        enabled: Boolean(conversationId),
        staleTime: 30 * 1000,
    });
}