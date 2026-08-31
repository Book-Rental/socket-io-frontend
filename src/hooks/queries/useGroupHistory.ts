import { useQuery } from "@tanstack/react-query";

import { fetchGroupHistory } from "../../utils/chatApi";

export function useGroupHistory(
    userId: string | null
) {
    return useQuery({
        queryKey: [
            "groupMessages",
            userId,
        ],

        queryFn: () =>
            fetchGroupHistory(
                userId!
            ),

        enabled: Boolean(userId),

        staleTime: 30 * 1000,
    });
}