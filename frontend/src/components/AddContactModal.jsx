import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserPlus, MessageSquare, Loader2, Check } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:7000";

const AddContactModal = ({ isOpen, onClose, onContactAdded, onSelectContact }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [addingMap, setAddingMap] = useState({});

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResults([]);
            setError('');
            return;
        }
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        const timer = setTimeout(async () => {
            try {
                const response = await axios.get(
                    `${API_BASE}/contacts/search?q=${encodeURIComponent(query.trim())}`,
                    { withCredentials: true }
                );
                setResults(response.data.data || []);
            } catch (err) {
                console.error("Search error:", err);
                setError(err.response?.data?.message || 'Failed to search users');
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleAddContact = async (targetUser) => {
        setAddingMap(prev => ({ ...prev, [targetUser._id]: true }));
        try {
            const response = await axios.post(
                `${API_BASE}/contacts/add`,
                { contactUserId: targetUser._id },
                { withCredentials: true }
            );

            const addedContact = response.data.data;
            if (onContactAdded) {
                onContactAdded(addedContact);
            }

            // Update local state to show 'In Contacts'
            setResults(prev => prev.map(u => u._id === targetUser._id ? { ...u, isAlreadyContact: true } : u));
            return addedContact;
        } catch (err) {
            console.error("Add contact error:", err);
            setError(err.response?.data?.message || 'Failed to add contact');
            return null;
        } finally {
            setAddingMap(prev => ({ ...prev, [targetUser._id]: false }));
        }
    };

    const handleStartChat = async (targetUser) => {
        let contactObj = null;
        if (!targetUser.isAlreadyContact) {
            contactObj = await handleAddContact(targetUser);
        }

        if (onSelectContact) {
            const selected = contactObj || {
                _id: `temp-${targetUser._id}`,
                owner: '',
                isFromConversation: true,
                starred: false,
                contact: {
                    _id: targetUser._id,
                    username: targetUser.username,
                    email: targetUser.email,
                    avatar: targetUser.avatar,
                    isOnline: targetUser.isOnline
                }
            };
            onSelectContact(selected);
        }
        onClose();
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };

    const getAvatarColor = (name) => {
        const colors = [
            'from-zinc-700 to-zinc-900', 'from-neutral-600 to-neutral-800',
            'from-gray-700 to-black', 'from-stone-600 to-stone-900',
            'from-neutral-700 to-black', 'from-zinc-800 to-black',
            'from-gray-600 to-gray-900', 'from-stone-700 to-black',
        ];
        let hash = 0;
        for (let i = 0; i < (name?.length || 0); i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="w-full max-w-md bg-[#111114] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-black flex items-center justify-center">
                                    <UserPlus className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-white font-semibold text-lg">Search Contacts</h2>
                                    <p className="text-gray-400 text-xs">Search by username or email to start chatting</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 border-b border-white/[0.06]">
                            <div className="relative flex items-center">
                                <Search className="absolute left-3.5 text-gray-500 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Type name or email address..."
                                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl py-2.5 pl-10 pr-10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-white/40 transition-all font-light"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    autoFocus
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery('')}
                                        className="absolute right-3 text-gray-500 hover:text-gray-300"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="px-6 pt-3 text-red-400 text-xs text-center">
                                {error}
                            </div>
                        )}

                        {/* Results List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar min-h-[220px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-white/70" />
                                    <span className="text-xs">Searching users...</span>
                                </div>
                            ) : !query.trim() ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-600 text-center gap-2">
                                    <Search className="w-8 h-8 opacity-20" />
                                    <p className="text-sm font-medium">Search for people on RelayMesh</p>
                                    <p className="text-xs text-gray-600 max-w-[240px]">Type any part of their username or email to see instant suggestions.</p>
                                </div>
                            ) : results.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-center gap-2">
                                    <p className="text-sm">No users found</p>
                                    <p className="text-xs text-gray-600">Try searching with a different name or email snippet.</p>
                                </div>
                            ) : (
                                results.map((u) => {
                                    const isAdding = addingMap[u._id];
                                    return (
                                        <div
                                            key={u._id}
                                            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-all border border-white/[0.04] group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(u.username)} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
                                                    {getInitials(u.username)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-white font-medium text-sm truncate">{u.username}</p>
                                                        {u.isOnline && (
                                                            <span className="w-2 h-2 rounded-full bg-white shadow-sm" />
                                                        )}
                                                    </div>
                                                    <p className="text-gray-500 text-xs truncate">{u.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {u.isAlreadyContact ? (
                                                    <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium">
                                                        <Check className="w-3 h-3" /> Contact
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAddContact(u)}
                                                        disabled={isAdding}
                                                        className="text-xs bg-white/10 hover:bg-white hover:text-black text-gray-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-medium"
                                                    >
                                                        {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                                                        Add
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleStartChat(u)}
                                                    className="text-xs bg-white hover:bg-gray-200 text-black px-3 py-1.5 rounded-lg shadow-md transition-all flex items-center gap-1 font-medium"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    Message
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AddContactModal;
