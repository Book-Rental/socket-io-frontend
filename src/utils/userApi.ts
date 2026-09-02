const API_BASE = import.meta.env.VITE_API_URL;

export interface BookRentalUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface UsersPageResponse {
    data?: {
        users?: BookRentalUser[];
        meta?: {
            totalPages: number;
            currentPage: number;
            hasMore: boolean;
        };
    };
    users?: BookRentalUser[];
    meta?: {
        totalPages: number;
        currentPage: number;
        hasMore: boolean;
    };
}

async function fetchUsersPage(page: number): Promise<UsersPageResponse> {
    const res = await fetch(`${API_BASE}/api/user?page=${page}&limit=100`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch users page " + page);
    return res.json();
}

export async function fetchAllUsers(): Promise<BookRentalUser[]> {
    const allUsers: BookRentalUser[] = [];

    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const result = await fetchUsersPage(page);

        const pageUsers = result?.data?.users ?? result?.users ?? [];
        const meta = result?.data?.meta ?? result?.meta;

        allUsers.push(...pageUsers);

        hasMore = meta?.hasMore ?? false;
        page += 1;

        if (page > 50) break;
    }

    return allUsers;
}