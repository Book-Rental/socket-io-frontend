import { useQuery } from "@tanstack/react-query";

import { fetchPrivateHistory } from "../../utils/chatApi";

export function usePrivateHistory(
    userA: string | null,
    userB: string | null
) {
    return useQuery({
        queryKey: [
            "privateMessages",
            userA,
            userB,
        ],

        queryFn: () =>
            fetchPrivateHistory(
                userA!,
                userB!
            ),

        enabled:
            Boolean(userA) &&
            Boolean(userB),

        staleTime: 30 * 1000,
    });
}