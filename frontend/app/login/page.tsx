'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { Input, Button } from '@/components/ui/common';
import type { Token, User } from '@/types/auth';

export default function Login() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Global Show Password state for main form
    const [showPassword, setShowPassword] = useState(false);

    // Forgot Password Modal State
    const [forgotOpen, setForgotOpen] = useState(false);
    const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: Code+New Pass, 3: Success
    const [forgotData, setForgotData] = useState({
        email: '',
        reset_code: '',
        new_password: '',
    });
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotError, setForgotError] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);

    const persistSession = async (email: string, password: string) => {
        const data = new URLSearchParams();
        data.append('username', email);
        data.append('password', password);

        const tokenResp = await api.post<Token>('/auth/token', data, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        localStorage.setItem('token', tokenResp.data.access_token);
        const profileResp = await api.get<User>('/users/me');
        localStorage.setItem('user', JSON.stringify(profileResp.data));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            setError('Email and password are required');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await persistSession(formData.email, formData.password);
            router.push('/dashboard');
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.message || 'Login failed';
            setError(typeof msg === 'string' ? msg : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    // Open Forgot Password Modal (and auto-fill email)
    const openForgotModal = () => {
        setForgotError('');
        setForgotMessage('');
        setForgotStep(1);
        setForgotData({ email: formData.email, reset_code: '', new_password: '' });
        setForgotOpen(true);
    };

    const handleForgotSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotError('');
        setForgotMessage('');
        if (!forgotData.email) {
            setForgotError('Enter your email to reset.');
            return;
        }
        setForgotLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: forgotData.email });
            setForgotMessage('If an account exists, a reset code was sent.');
            // Automatically switch to Step 2
            setTimeout(() => {
                setForgotMessage('');
                setForgotStep(2);
            }, 1500);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.message || 'Something went wrong';
            setForgotError(typeof msg === 'string' ? msg : 'Something went wrong');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleForgotResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotError('');
        setForgotMessage('');
        if (!forgotData.reset_code || !forgotData.new_password) {
            setForgotError('Enter the reset code and a new password.');
            return;
        }
        setForgotLoading(true);
        try {
            await api.post('/auth/reset-password', forgotData);
            setForgotStep(3); // Success Screen
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.message || 'Failed to reset password';
            setForgotError(typeof msg === 'string' ? msg : 'Failed to reset password');
        } finally {
            setForgotLoading(false);
        }
    };

    // Helper specific to formatting the eye icon universally
    const EyeIcon = ({ show }: { show: boolean }) => (
        show ? (
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
        ) : (
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        )
    );

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-100 -z-10"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse -z-10"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-2000 -z-10"></div>

            {/* Login Card */}
            <div className="card-premium w-full max-w-md animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-block mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-glow-blue">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold mb-2 gradient-text">Welcome Back</h1>
                    <p className="text-gray-600">Continue your career transformation</p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                    {error && (
                        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-slide-in">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-medium text-red-800">{error}</span>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                        <Input
                            type="email"
                            required
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-gray-700">Password</label>
                            <button
                                type="button"
                                onClick={openForgotModal}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                Forgot?
                            </button>
                        </div>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                                <EyeIcon show={showPassword} />
                            </button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        isLoading={loading}
                        className="btn-modern btn-primary w-full py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Sign In
                    </Button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-500">New to Job Genie?</span>
                        </div>
                    </div>

                    <Link
                        href="/signup"
                        className="btn-modern btn-secondary w-full py-3 text-center block"
                    >
                        Create Account
                    </Link>
                </form>
            </div>

            {/* Complete Multi-Step Forgot Password Modal */}
            {forgotOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 animate-scale-in">

                        {forgotStep === 1 && (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Reset password</h2>
                                        <p className="text-sm text-gray-500">Confirm your email to get reset instructions.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setForgotOpen(false)}
                                        className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>

                                <form className="space-y-4" onSubmit={handleForgotSendEmail}>
                                    <Input
                                        type="email"
                                        required
                                        placeholder="you@example.com"
                                        value={forgotData.email}
                                        onChange={(e) => setForgotData({ ...forgotData, email: e.target.value })}
                                    />

                                    {forgotError && <p className="text-sm text-red-600">{forgotError}</p>}
                                    {forgotMessage && <p className="text-sm text-emerald-600">{forgotMessage}</p>}

                                    <div className="flex items-center gap-2 justify-end pt-2">
                                        <Button type="button" variant="ghost" onClick={() => setForgotOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" isLoading={forgotLoading}>
                                            Send Code
                                        </Button>
                                    </div>
                                </form>
                            </>
                        )}

                        {forgotStep === 2 && (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Check your email</h2>
                                        <p className="text-sm text-gray-500">
                                            We sent a 6-digit code to <strong>{forgotData.email}</strong>. Entering it below allows you to choose a new password.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setForgotOpen(false)}
                                        className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>

                                <form className="space-y-4" onSubmit={handleForgotResetPassword}>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">6-Digit Code</label>
                                        <Input
                                            type="text"
                                            required
                                            placeholder="123456"
                                            value={forgotData.reset_code}
                                            onChange={(e) => setForgotData({ ...forgotData, reset_code: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                                        <div className="relative">
                                            <Input
                                                type={showForgotNewPassword ? "text" : "password"}
                                                required
                                                placeholder="••••••••"
                                                value={forgotData.new_password}
                                                onChange={(e) => setForgotData({ ...forgotData, new_password: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                            >
                                                <EyeIcon show={showForgotNewPassword} />
                                            </button>
                                        </div>
                                    </div>

                                    {forgotError && <p className="text-sm text-red-600">{forgotError}</p>}

                                    <div className="flex items-center gap-2 justify-end pt-2">
                                        <Button type="button" variant="ghost" onClick={() => setForgotStep(1)}>
                                            Back
                                        </Button>
                                        <Button type="submit" isLoading={forgotLoading}>
                                            Reset Password
                                        </Button>
                                    </div>
                                </form>
                            </>
                        )}

                        {forgotStep === 3 && (
                            <div className="text-center py-6 space-y-4">
                                <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Password Reset!</h2>
                                <p className="text-gray-500 mb-6">Your password has been successfully updated. You can now login with your new credentials.</p>
                                <Button
                                    className="w-full"
                                    onClick={() => {
                                        setFormData((prev) => ({ ...prev, password: forgotData.new_password }));
                                        setForgotOpen(false);
                                    }}
                                >
                                    Return to Login
                                </Button>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}
