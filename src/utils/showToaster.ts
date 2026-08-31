export type ToastType = "success" | "error" | "loading" | "custom"

export const showToast = (
    message: string,
    type: ToastType
) => {
    const event = new CustomEvent("app-toast-notification", {
        detail: {
            message,
            type,
        },
    });
    window.dispatchEvent(event);

};