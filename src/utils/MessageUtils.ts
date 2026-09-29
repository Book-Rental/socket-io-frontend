export const formatMessageDateTime = (date: string | Date) => {
    const messageDate = new Date(date);

    if (Number.isNaN(messageDate.getTime())) {
        return "";
    }

    const now = new Date();

    const isToday =
        messageDate.getDate() === now.getDate() &&
        messageDate.getMonth() === now.getMonth() &&
        messageDate.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const isYesterday =
        messageDate.getDate() === yesterday.getDate() &&
        messageDate.getMonth() === yesterday.getMonth() &&
        messageDate.getFullYear() === yesterday.getFullYear();

    const time = messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    if (isToday) {
        return `Today · ${time}`;
    }

    if (isYesterday) {
        return `Yesterday · ${time}`;
    }

    const formattedDate = messageDate.toLocaleDateString([], {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

    return `${formattedDate} · ${time}`;
};