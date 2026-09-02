import Login from "../Pages/Login";
import ProtectedLayout from "./ProtectedLayout";
import { login } from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export default function AppRoot() {
    const dispatch = useAppDispatch();
    const currentUser = useAppSelector((state) => state.auth.currentUser);

    if (!currentUser) {
        return <Login onLogin={(user) => dispatch(login(user))} />;
    }

    return <ProtectedLayout />;
}