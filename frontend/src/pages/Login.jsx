import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../layouts/AuthLayout';
import { LogIn, Mail, Lock, Globe } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
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
        window.location.href = `http://${window.location.hostname}:${import.meta.env.VITE_API_PORT || 7100}/auth/google`;
    };

    return (
        <AuthLayout title="Welcome Back" subtitle="Securely sign in to your RelayMesh account">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="email"
                        placeholder="Email Address"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-light"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-light"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <div className="flex justify-end pr-1">
                    <Link to="/forgot-password" virtual-link="true" className="text-xs text-blue-400/80 hover:text-blue-400 transition-colors">
                        Forgot Password?
                    </Link>
                </div>

                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group"
                >
                    Sign In <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="relative my-6 text-center">
                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10" />
                    <span className="relative px-4 bg-[#0a0a0a] text-gray-500 text-xs uppercase tracking-widest">Or continue with</span>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-3"
                >
                    <Globe className="w-5 h-5 text-blue-400" /> Google
                </button>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Don't have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">Create one</Link>
                </p>
            </form>
        </AuthLayout>
    );
};

export default Login;
