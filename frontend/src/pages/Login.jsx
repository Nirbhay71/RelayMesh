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
                    <div style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: '#f87171',
                        padding: '0.75rem',
                        borderRadius: '0.75rem',
                        fontSize: '0.8rem',
                        textAlign: 'center',
                        marginBottom: '0.5rem'
                    }}>
                        {error}
                    </div>
                )}

                {/* ── Google Button ─────────────────────────────── */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="auth-pill-btn group"
                    id="google-login-btn"
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <svg style={{ width: '1.2rem', height: '1.2rem', flexShrink: 0 }} viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.875rem' }}>Continue with Google</span>
                    </div>
                    <div className="auth-pill-badge">
                        <ArrowRight style={{ width: '0.875rem', height: '0.875rem', color: 'rgba(255,255,255,0.7)' }} />
                    </div>
                </button>

                {/* ── Email/Password reveal ─────────────────────── */}
                {!showEmailForm ? (
                    <button
                        type="button"
                        onClick={() => setShowEmailForm(true)}
                        className="auth-pill-btn group"
                        id="show-email-form-btn"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Mail style={{ width: '1.2rem', height: '1.2rem', color: 'rgba(156,163,175,0.8)', flexShrink: 0 }} />
                            <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.875rem' }}>Continue with Email</span>
                        </div>
                        <div className="auth-pill-badge">
                            <ArrowRight style={{ width: '0.875rem', height: '0.875rem', color: 'rgba(255,255,255,0.7)' }} />
                        </div>
                    </button>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        <input
                            type="email"
                            placeholder="Email address"
                            className="auth-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            autoComplete="username"
                            id="login-email"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="auth-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            id="login-password"
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Link
                                to="/forgot-password"
                                style={{ fontSize: '0.75rem', color: 'rgba(107,114,128,1)' }}
                                onMouseEnter={e => e.target.style.color = 'rgba(209,213,219,1)'}
                                onMouseLeave={e => e.target.style.color = 'rgba(107,114,128,1)'}
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <button
                            type="submit"
                            className="auth-pill-btn group"
                            id="login-submit-btn"
                        >
                            <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.875rem' }}>Sign In</span>
                            <div className="auth-pill-badge">
                                <ArrowRight
                                    style={{ width: '0.875rem', height: '0.875rem', color: '#fff' }}
                                    className="group-hover:translate-x-0.5 transition-transform"
                                />
                            </div>
                        </button>
                    </form>
                )}
            </div>

            {/* Terms */}
            <p style={{ color: 'rgba(75,85,99,0.9)', fontSize: '11px', marginTop: '1.5rem', lineHeight: 1.6 }}>
                By signing in, you agree to RelayMesh's{' '}
                <span style={{ color: 'rgba(156,163,175,1)', cursor: 'pointer' }}>Terms of Service</span>
                {' '}and{' '}
                <span style={{ color: 'rgba(156,163,175,1)', cursor: 'pointer' }}>Privacy Policy</span>.
            </p>

            <p style={{ color: 'rgba(75,85,99,0.9)', fontSize: '0.875rem', marginTop: '1.25rem' }}>
                No account?{' '}
                <Link to="/register" style={{ color: 'rgba(209,213,219,1)', fontWeight: 500 }}>
                    Create one
                </Link>
            </p>
        </AuthLayout>
    );
};

export default Login;
