import { useForm } from "react-hook-form";
import { Rb_Button, Rb_Icon, Rb_Input, Rb_Label, Rb_Text, } from "@rentbook/rentbook-ui-lib";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { showToast } from "../utils/showToaster";
import { useState } from "react";
import { CurrentUser } from "../store/authSlice";
import bookbuddylogo from "../assets/bookbuddylogo.png";

interface LoginProps {
    onLogin: (user: CurrentUser) => void;
}

interface LoginFormData {
    email: string;
    password: string;
}

const API_BASE = import.meta.env.VITE_API_URL as string;

export default function Login({ onLogin }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, formState: { errors }, } = useForm<LoginFormData>();
    const onSubmit = async (data: LoginFormData) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    email: data.email.trim(),
                    password: data.password,
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                showToast(
                    result?.message || "Invalid email or password",
                    "error"
                );
                return;
            }

            const userInfo = result?.data?.userInfo ?? result?.userInfo;

            if (!userInfo?.email) {
                showToast("Unexpected response from server", "error");
                return;
            }

            const currentUser: CurrentUser = {
                id: userInfo._id,
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                email: userInfo.email,
            };
            showToast(`Welcome back, ${currentUser.firstName}`, "success");
            onLogin(currentUser);

        } catch (error) {
            console.error("Login error:", error);
            showToast("Could not reach the server. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
            <div className="w-full max-w-md">
                <div className="mb-6 text-center sm:mb-8">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/20 sm:h-16 sm:w-16">
                        <img
                            src={bookbuddylogo}
                            alt="BookBuddy"
                            className="mx-auto h-24 w-auto object-contain sm:h-28"
                        />
                    </div>

                    <h1 className="mt-2 text-2xl font-bold text-blue-600 sm:text-3xl">
                        BookBuddy
                    </h1>

                    <p className="mt-2 text-sm text-slate-500 sm:text-base">
                        Real-time communication demo
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8"
                >
                    <h2 className="text-xl font-semibold text-slate-800">
                        Welcome back
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                        Login to continue
                    </p>

                    <div className="mt-6">
                        <Rb_Label
                            htmlFor="email"
                            required
                            className="text-sm text-slate-700"
                        >
                            Email
                        </Rb_Label>

                        <Rb_Input
                            id="email"
                            type="email"
                            placeholder="Enter email"
                            borderClass="border !border-slate-700"
                            error={!!errors.email}
                            className="w-full rounded-xl bg-slate-50 px-4 py-3 text-slate-800"
                            {...register("email", {
                                required: "Email is required",
                                pattern: {
                                    value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                                    message: "Please enter a valid email address",
                                },
                            })}
                        />

                        <Rb_Text
                            variant="p"
                            className="h-4 mt-1 text-xs leading-tight text-red-500"
                        >
                            {errors.email?.message || ""}
                        </Rb_Text>
                    </div>

                    <div className="mt-5">
                        <div className="relative">
                            <Rb_Label
                                htmlFor="password"
                                required
                                className="text-sm text-slate-300"
                            >
                                Password
                            </Rb_Label>

                            <Rb_Input
                                id="password"
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                placeholder="Enter password"
                                borderClass="border !border-slate-700"
                                error={!!errors.password}
                                className="w-full rounded-xl bg-slate-50 px-4 py-3 pr-10 text-white"
                                {...register("password", {
                                    required: "Password is required",
                                })}
                            />

                            <Rb_Button
                                variant="primary"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
                                className="absolute right-3 top-[55%] -translate-y-1/2 text-gray-500"
                            >
                                <Rb_Icon
                                    icon={
                                        showPassword
                                            ? FaEyeSlash
                                            : FaEye
                                    }
                                    size={15}
                                    color="#3b82f6"
                                />
                            </Rb_Button>

                            <Rb_Text
                                variant="p"
                                className="h-4 mt-1 text-xs leading-tight text-red-500"
                            >
                                {errors.password?.message || ""}
                            </Rb_Text>
                        </div>
                    </div>

                    <Rb_Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={loading}
                        className="mt-6 w-full rounded-xl"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </Rb_Button>
                </form>
            </div>
        </div>
    );
}
