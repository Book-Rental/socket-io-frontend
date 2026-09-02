import { useQuery } from "@tanstack/react-query";
import { fetchConversationHistory } from "../../utils/chatApi";

export function useConversationHistory(conversationId: string | null) {
    return useQuery({
        queryKey: ["conversationMessages", conversationId],
        queryFn: () => fetchConversationHistory(conversationId!),
        enabled: Boolean(conversationId),
        staleTime: 30 * 1000,
    });
}