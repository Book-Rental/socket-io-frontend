import {
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import Login from "../Pages/Login";

import PrivateChat from "../Pages/PrivateChat";
import BroadcastPage from "../Pages/BroadcastPage";
import RoomsPage from "../Pages/RoomsPage";
import GroupChatPage from "../Pages/GroupChatPage";

import ProtectedLayout from "./ProtectedLayout";
import { useAuth } from "../context/AuthContext";


export default function AppRoutes() {

    const {
        currentUser,
        handleLogin,
    } = useAuth();


    return (
        <Routes>

            <Route
                path="/login"
                element={
                    currentUser ? (
                        <Navigate
                            to="/chat"
                            replace
                        />
                    ) : (
                        <Login
                            onLogin={handleLogin}
                        />
                    )
                }
            />


            {/* =========================
                PROTECTED APPLICATION
            ========================= */}

            <Route
                element={
                    <ProtectedLayout />
                }
            >

                <Route
                    path="/chat"
                    element={
                        <PrivateChat />
                    }
                />

                <Route
                    path="/chat/:userId"
                    element={
                        <PrivateChat />
                    }
                />

                <Route
                    path="/broadcast"
                    element={
                        <BroadcastPage />
                    }
                />

                <Route
                    path="/rooms"
                    element={
                        <RoomsPage />
                    }
                />

                <Route
                    path="/group"
                    element={
                        <GroupChatPage />
                    }
                />

            </Route>


            {/* =========================
                ROOT
            ========================= */}

            <Route
                path="/"
                element={
                    <Navigate
                        to="/chat"
                        replace
                    />
                }
            />


            {/* =========================
                UNKNOWN ROUTES
            ========================= */}

            <Route
                path="*"
                element={
                    <Navigate
                        to="/chat"
                        replace
                    />
                }
            />

        </Routes>
    );
}