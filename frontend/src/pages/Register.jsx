import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../layouts/AuthLayout';
import { ArrowRight, Mail, User } from 'lucide-react';

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
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center mb-2">
                        {error}
                    </div>
                )}

                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Username"
                        className="auth-input pl-11"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        id="register-username"
                    />
                </div>

                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                    <input
                        type="email"
                        placeholder="Email address"
                        className="auth-input pl-11"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        id="register-email"
                    />
                </div>

                <input
                    type="password"
                    placeholder="Password"
                    className="auth-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    id="register-password"
                />

                <div className="pt-1">
                    <button
                        type="submit"
                        className="auth-pill-btn auth-pill-btn--primary group"
                        id="register-submit-btn"
                    >
                        <span className="text-white font-medium text-sm">Create Account</span>
                        <div className="auth-pill-badge auth-pill-badge--primary">
                            <ArrowRight className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </button>
                </div>
            </form>

            {/* Terms */}
            <p className="text-gray-600 text-[11px] mt-6 leading-relaxed">
                By creating an account, you agree to RelayMesh's{' '}
                <span className="text-gray-400 hover:text-gray-200 cursor-pointer transition-colors">Terms of Service</span>
                {' '}and{' '}
                <span className="text-gray-400 hover:text-gray-200 cursor-pointer transition-colors">Privacy Policy</span>.
            </p>

            <p className="text-gray-600 text-sm mt-5">
                Already have an account?{' '}
                <Link to="/login" className="text-gray-300 hover:text-white font-medium transition-colors">
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    );
};

export default Register;
