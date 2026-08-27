import { FormEvent, useState } from "react";
import { registerUser } from "../api";

interface RegisterProps {
    onRegistered: () => void;
    onLogin: () => void;
}

export default function Register({
    onRegistered,
    onLogin,
}: RegisterProps) {

    const [username, setUsername] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [error, setError] =
        useState("");


    const handleSubmit = (
        e: FormEvent
    ) => {

        e.preventDefault();

        setError("");


        if (
            !username.trim() ||
            !password.trim()
        ) {
            setError(
                "All fields are required"
            );
            return;
        }


        if (password !== confirmPassword) {
            setError(
                "Passwords do not match"
            );
            return;
        }


        const success = registerUser(
            username.trim(),
            password
        );


        if (!success) {
            setError(
                "Username already exists"
            );
            return;
        }


        onRegistered();
    };


    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">

            <div className="w-full max-w-md">

                <div className="text-center mb-8">

                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600">
                        <span className="text-3xl">
                            💬
                        </span>
                    </div>

                    <h1 className="text-3xl font-bold text-white">
                        Create Account
                    </h1>

                    <p className="mt-2 text-slate-400">
                        Join the real-time chat demo
                    </p>

                </div>


                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
                >

                    {error && (
                        <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}


                    <label className="mb-2 block text-sm text-slate-300">
                        Username
                    </label>

                    <input
                        value={username}
                        onChange={(e) =>
                            setUsername(e.target.value)
                        }
                        placeholder="Choose username"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500"
                    />


                    <label className="mb-2 mt-5 block text-sm text-slate-300">
                        Password
                    </label>

                    <input
                        type="password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        placeholder="Create password"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500"
                    />


                    <label className="mb-2 mt-5 block text-sm text-slate-300">
                        Confirm Password
                    </label>

                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) =>
                            setConfirmPassword(e.target.value)
                        }
                        placeholder="Confirm password"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500"
                    />


                    <button
                        type="submit"
                        className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500"
                    >
                        Create Account
                    </button>


                    <p className="mt-6 text-center text-sm text-slate-400">

                        Already have an account?

                        <button
                            type="button"
                            onClick={onLogin}
                            className="ml-1 text-indigo-400 hover:text-indigo-300"
                        >
                            Login
                        </button>

                    </p>

                </form>

            </div>

        </div>
    );
}