import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../layouts/AuthLayout';
import { ArrowRight } from 'lucide-react';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(username, email, password);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <AuthLayout
            tagline={<>Start messaging<br />with RelayMesh.</>}
            subtitle="Create your free account and connect instantly."
        >
            <form onSubmit={handleSubmit} className="space-y-3">
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

                <input
                    type="text"
                    placeholder="Username"
                    className="auth-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    id="register-username"
                    autoComplete="off"
                />

                <input
                    type="email"
                    placeholder="Email address"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    id="register-email"
                    autoComplete="off"
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="auth-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    id="register-password"
                    autoComplete="new-password"
                />

                <div style={{ paddingTop: '0.25rem' }}>
                    <button
                        type="submit"
                        className="auth-pill-btn group"
                        id="register-submit-btn"
                    >
                        <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.875rem' }}>
                            Create Account
                        </span>
                        <div className="auth-pill-badge">
                            <ArrowRight
                                style={{ width: '0.875rem', height: '0.875rem', color: '#fff' }}
                                className="group-hover:translate-x-0.5 transition-transform"
                            />
                        </div>
                    </button>
                </div>
            </form>

            {/* Terms */}
            <p style={{ color: 'rgba(75,85,99,0.9)', fontSize: '11px', marginTop: '1.5rem', lineHeight: 1.6 }}>
                By creating an account, you agree to RelayMesh's{' '}
                <span style={{ color: 'rgba(156,163,175,1)', cursor: 'pointer' }}>Terms of Service</span>
                {' '}and{' '}
                <span style={{ color: 'rgba(156,163,175,1)', cursor: 'pointer' }}>Privacy Policy</span>.
            </p>

            <p style={{ color: 'rgba(75,85,99,0.9)', fontSize: '0.875rem', marginTop: '1.25rem' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: 'rgba(209,213,219,1)', fontWeight: 500 }}>
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    );
};

export default Register;
