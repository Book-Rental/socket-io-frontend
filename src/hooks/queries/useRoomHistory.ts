import { useQuery } from "@tanstack/react-query";

import { fetchRoomHistory } from "../../utils/chatApi";

export function useRoomHistory(
    roomId: string | null
) {
    return useQuery({
        queryKey: [
            "roomMessages",
            roomId,
        ],

        queryFn: () =>
            fetchRoomHistory(
                roomId!
            ),

        enabled: Boolean(roomId),

        staleTime: 30 * 1000,
    });
}