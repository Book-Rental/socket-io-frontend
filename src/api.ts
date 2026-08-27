const USERS_KEY = "socket_chat_users";
const CURRENT_USER_KEY = "socket_chat_current_user";

interface User {
    username: string;
    password: string;
}

export function registerUser(
    username: string,
    password: string
): boolean {
    const users: User[] = JSON.parse(
        localStorage.getItem(USERS_KEY) || "[]"
    );

    const exists = users.some(
        (user) => user.username === username
    );

    if (exists) {
        return false;
    }

    users.push({
        username,
        password,
    });

    localStorage.setItem(
        USERS_KEY,
        JSON.stringify(users)
    );

    return true;
}

export function loginUser(
    username: string,
    password: string
): boolean {
    const users: User[] = JSON.parse(
        localStorage.getItem(USERS_KEY) || "[]"
    );

    const user = users.find(
        (user) =>
            user.username === username &&
            user.password === password
    );

    if (!user) {
        return false;
    }

    localStorage.setItem(
        CURRENT_USER_KEY,
        username
    );

    return true;
}

export function getCurrentUser(): string | null {
    return localStorage.getItem(
        CURRENT_USER_KEY
    );
}

export function logoutUser(): void {
    localStorage.removeItem(
        CURRENT_USER_KEY
    );
}