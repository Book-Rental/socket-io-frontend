import toast from "react-hot-toast";

export type ToastType = "success" | "error" | "loading" | "custom";

export const showToast = (
    message: string,
    type: ToastType
) => {
    switch (type) {
        case "success":
            toast.success(message);
            break;

        case "error":
            toast.error(message);
            break;

        case "loading":
            toast.loading(message);
            break;

        case "custom":
            toast(message);
            break;

        default:
            toast(message);
    }
};