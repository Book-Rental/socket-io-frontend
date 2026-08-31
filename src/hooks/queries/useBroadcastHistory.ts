import { useQuery } from "@tanstack/react-query";

import { fetchBroadcastHistory } from "../../utils/chatApi";

export function useBroadcastHistory() {
    return useQuery({
        queryKey: [
            "broadcastMessages",
        ],

        queryFn:
            fetchBroadcastHistory,

        staleTime: 30 * 1000,
    });
}