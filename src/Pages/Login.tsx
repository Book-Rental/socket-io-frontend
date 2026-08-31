import { FormEvent, useState } from "react";

interface LoginProps {
    onLogin: (username: string) => void;
    onRegister: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL as string;

export default function Login({
    onLogin,
}: LoginProps) {

    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [email, setEmail] = useState(""); 
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password.trim()) {
            setError("Email and password are required");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const result = await res.json();
            if (!res.ok) {
                setError(result?.message || "Invalid email or password");
                setLoading(false);
                return;
            }
            const userInfo = result?.data?.userInfo ?? result?.userInfo;
            if (!userInfo?.email) {
                setError("Unexpected response from server");
                setLoading(false);
                return;
            }

            const displayName = userInfo.firstName || userInfo.email;
            onLogin(displayName);
        } catch (err) {
            console.error("Login error:", err);
            setError("Could not reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
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
                            Email
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email"
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
                        disabled={loading}
                        className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                    {/* <p className="mt-6 text-center text-sm text-slate-400">
                        Don't have an account?
                        <button
                            type="button"
                            onClick={onRegister}
                            className="ml-1 font-medium text-indigo-400 hover:text-indigo-300"
                        >
                            Register
                        </button>
                    </p> */}
                </form>
            </div>
        </div>
    );
}