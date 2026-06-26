import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../layouts/AuthLayout';
import { ShieldCheck, Lock, ArrowRight, KeyRound } from 'lucide-react';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const [email] = useState(searchParams.get('email') || '');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post(`http://${window.location.hostname}:${import.meta.env.VITE_API_PORT || 7100}/otp/reset-password`, { email, otp, newPassword }, { withCredentials: true });
            setMessage("Password reset successfully! Redirecting...");
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Reset Password" subtitle="Enter the 6-digit OTP and your new password">
            <form onSubmit={handleSubmit} className="space-y-4">
                {message && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm text-center">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="6-Digit OTP"
                        maxLength={6}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-light"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                    />
                </div>

                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="password"
                        placeholder="New Password"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-light"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                    {loading ? 'Resetting...' : 'Reset Password'} <ShieldCheck className="w-4 h-4" />
                </button>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Wait, I remember it! <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Take me back</Link>
                </p>
            </form>
        </AuthLayout>
    );
};

export default ResetPassword;
