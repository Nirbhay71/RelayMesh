import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../layouts/AuthLayout';
import { ArrowRight, Mail } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showEmailForm, setShowEmailForm] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:7100'}/auth/google`;
    };

    return (
        <AuthLayout
            tagline={<>Reconnect with<br />your conversations.</>}
            subtitle="Sign in securely to your RelayMesh account."
        >
            <div className="space-y-3">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center mb-4">
                        {error}
                    </div>
                )}

                {/* Google Button */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="auth-pill-btn group"
                    id="google-login-btn"
                >
                    <div className="flex items-center gap-3">
                        {/* Google "G" icon */}
                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span className="text-white font-medium text-sm">Continue with Google</span>
                    </div>
                    <div className="auth-pill-badge">
                        <ArrowRight className="w-3.5 h-3.5 text-white/70 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </button>

                {/* Email/Password Button or Form */}
                {!showEmailForm ? (
                    <button
                        type="button"
                        onClick={() => setShowEmailForm(true)}
                        className="auth-pill-btn group"
                        id="show-email-form-btn"
                    >
                        <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <span className="text-white font-medium text-sm">Continue with Email</span>
                        </div>
                        <div className="auth-pill-badge">
                            <ArrowRight className="w-3.5 h-3.5 text-white/70 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </button>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-2.5">
                        <input
                            type="email"
                            placeholder="Email address"
                            className="auth-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            id="login-email"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="auth-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            id="login-password"
                        />
                        <div className="flex justify-end pr-0.5">
                            <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                        <button type="submit" className="auth-pill-btn auth-pill-btn--primary group" id="login-submit-btn">
                            <span className="text-white font-medium text-sm">Sign In</span>
                            <div className="auth-pill-badge auth-pill-badge--primary">
                                <ArrowRight className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        </button>
                    </form>
                )}
            </div>

            {/* Terms */}
            <p className="text-gray-600 text-[11px] mt-6 leading-relaxed">
                By signing in, you agree to RelayMesh's{' '}
                <span className="text-gray-400 hover:text-gray-200 cursor-pointer transition-colors">Terms of Service</span>
                {' '}and{' '}
                <span className="text-gray-400 hover:text-gray-200 cursor-pointer transition-colors">Privacy Policy</span>.
            </p>

            <p className="text-gray-600 text-sm mt-5">
                No account?{' '}
                <Link to="/register" className="text-gray-300 hover:text-white font-medium transition-colors">
                    Create one
                </Link>
            </p>
        </AuthLayout>
    );
};

export default Login;
