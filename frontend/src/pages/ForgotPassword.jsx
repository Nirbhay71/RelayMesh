import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../layouts/AuthLayout';
import { Mail, ArrowRight } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:7100'}/otp/send`, { email });
            setMessage("OTP sent to your email!");
            setTimeout(() => navigate(`/reset-password?email=${email}`), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            tagline={<>Recover your<br />account access.</>}
            subtitle="Enter your email and we'll send you a recovery OTP."
        >
            <form onSubmit={handleSubmit} className="space-y-3">
                {message && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-sm text-center mb-2">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center mb-2">
                        {error}
                    </div>
                )}

                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                    <input
                        type="email"
                        placeholder="Email address"
                        className="auth-input pl-11"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        id="forgot-email"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="auth-pill-btn auth-pill-btn--primary group disabled:opacity-50"
                    id="forgot-submit-btn"
                >
                    <span className="text-white font-medium text-sm">
                        {loading ? 'Sending OTP...' : 'Send OTP'}
                    </span>
                    <div className="auth-pill-badge auth-pill-badge--primary">
                        <ArrowRight className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </button>
            </form>

            <p className="text-gray-600 text-sm mt-6">
                Remember your password?{' '}
                <Link to="/login" className="text-gray-300 hover:text-white font-medium transition-colors">
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    );
};

export default ForgotPassword;
