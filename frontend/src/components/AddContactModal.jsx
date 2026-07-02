import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Mail, User, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:7100";

const AddContactModal = ({ isOpen, onClose, onContactAdded }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const resetForm = () => {
        setUsername('');
        setEmail('');
        setError('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Client-side validation
        if (!username.trim()) {
            setError('Username is required');
            return;
        }

        if (!email.trim()) {
            setError('Email is required');
            return;
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(
                `${API_BASE}/contacts/add`,
                { username: username.trim(), email: email.trim() },
                { withCredentials: true }
            );

            onContactAdded(response.data.data);
            handleClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add contact');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="w-full max-w-md bg-[#111116] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                                    <UserPlus className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-white font-semibold text-lg">Add Contact</h2>
                                    <p className="text-gray-400 text-xs">Enter username and email to find a user</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <input
                                type="text"
                                placeholder="Username"
                                style={{
                                    width:'100%', background:'rgba(255,255,255,0.04)',
                                    border:'1px solid rgba(255,255,255,0.09)', borderRadius:'0.875rem',
                                    padding:'0.8rem 1rem', color:'#fff', fontSize:'0.875rem',
                                    fontWeight:300, outline:'none'
                                }}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoFocus
                            />

                            <input
                                type="email"
                                placeholder="Email address"
                                style={{
                                    width:'100%', background:'rgba(255,255,255,0.04)',
                                    border:'1px solid rgba(255,255,255,0.09)', borderRadius:'0.875rem',
                                    padding:'0.8rem 1rem', color:'#fff', fontSize:'0.875rem',
                                    fontWeight:300, outline:'none'
                                }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width:'100%', background:'rgba(99,102,241,0.85)',
                                    border:'none', borderRadius:'0.875rem',
                                    padding:'0.8rem 1rem', color:'#fff',
                                    fontWeight:500, fontSize:'0.875rem',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.5 : 1,
                                    display:'flex', alignItems:'center',
                                    justifyContent:'center', gap:'0.5rem',
                                    transition:'background 0.2s'
                                }}
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
                                ) : (
                                    <><UserPlus className="w-4 h-4" /> Add Contact</>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AddContactModal;
