import { FormEvent, useState } from "react";
import { loginUser } from "../api";

interface LoginProps {
    onLogin: (username: string) => void;
    onRegister: () => void;
}

export default function Login({
    onLogin,
    onRegister,
}: LoginProps) {
    const [username, setUsername] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [error, setError] =
        useState("");


    const handleSubmit = (
        e: FormEvent
    ) => {
        e.preventDefault();

        setError("");

        if (!username.trim() || !password.trim()) {
            setError(
                "Username and password are required"
            );
            return;
        }

        const success = loginUser(
            username.trim(),
            password
        );

        if (!success) {
            setError(
                "Invalid username or password"
            );
            return;
        }

        onLogin(username.trim());
    };


    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">

            <div className="w-full max-w-md">

                <div className="text-center mb-8">

                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
                        <span className="text-3xl">
                            💬
                        </span>
                    </div>

                    <h1 className="text-3xl font-bold text-white">
                        Socket Chat
                    </h1>

                    <p className="mt-2 text-slate-400">
                        Real-time communication demo
                    </p>

                </div>


                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
                >

                    <h2 className="text-xl font-semibold text-white">
                        Welcome back
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                        Login to continue
                    </p>


                    {error && (
                        <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}


                    <div className="mt-6">

                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Username
                        </label>

                        <input
                            value={username}
                            onChange={(e) =>
                                setUsername(e.target.value)
                            }
                            placeholder="Enter username"
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
                        />

                    </div>


                    <div className="mt-5">

                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            placeholder="Enter password"
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
                        />

                    </div>


                    <button
                        type="submit"
                        className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500"
                    >
                        Login
                    </button>


                    <p className="mt-6 text-center text-sm text-slate-400">

                        Don't have an account?

                        <button
                            type="button"
                            onClick={onRegister}
                            className="ml-1 font-medium text-indigo-400 hover:text-indigo-300"
                        >
                            Register
                        </button>

                    </p>

                </form>

            </div>

        </div>
    );
}