import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AddContactModal from '../components/AddContactModal';
import DeleteContactDialog from '../components/DeleteContactDialog';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
    UserPlus,
    Trash2,
    LogOut,
    MessageSquare,
    Search,
    MoreVertical,
    Send,
    Users,
    ChevronDown,
    Check,
    CheckCheck,
} from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:${import.meta.env.VITE_API_PORT || 7100}`;

const Home = () => {
    const { user, logout } = useAuth();
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socket, setSocket] = useState(null);
    const [conversationId, setConversationId] = useState(null);
    const [typingUsers, setTypingUsers] = useState([]);
    const typingTimeoutsRef = useRef({});

    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [contactToDelete, setContactToDelete] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const deliveryTimeoutRef = useRef(null);
    const seenTimeoutRef = useRef(null);

    const isScrolledToBottom = () => {
        if (!chatContainerRef.current) return false;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        return scrollHeight - scrollTop - clientHeight < 50;
    };

    const queueDeliveryAcks = (convId, lastMsgId) => {
        if (deliveryTimeoutRef.current) clearTimeout(deliveryTimeoutRef.current);
        deliveryTimeoutRef.current = setTimeout(() => {
            if (socket) {
                socket.emit("messagesDelivered", { conversationId: convId, lastDeliveredMessageId: lastMsgId });
            }
        }, 250);
    };

    const queueSeenAcks = (convId, lastMsgId) => {
        if (seenTimeoutRef.current) clearTimeout(seenTimeoutRef.current);
        seenTimeoutRef.current = setTimeout(() => {
            if (socket) {
                socket.emit("messagesSeen", { conversationId: convId, lastReadMessageId: lastMsgId });
            }
        }, 250);
    };

    const evaluateReadReceipts = () => {
        if (!document.hidden && conversationId && messages.length > 0 && isScrolledToBottom()) {
            const lastMsg = messages[messages.length - 1];
            const senderId = lastMsg.sender?._id || lastMsg.sender;
            if (senderId !== user?._id && (!lastMsg.readBy || !lastMsg.readBy.includes(user?._id))) {
                queueSeenAcks(conversationId, lastMsg._id);
            }
        }
    };

    useEffect(() => {
        evaluateReadReceipts();
    }, [messages, conversationId]);

    useEffect(() => {
        const handleVisibilityChange = () => evaluateReadReceipts();
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [messages, conversationId]);

    // Initialize Socket.IO
    useEffect(() => {
        const newSocket = io(API_BASE, {
            withCredentials: true,
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log("Connected to socket server");
        });

        // ─────────────────────────────────────────────────
        // Offline Sync (Missed Messages)
        // ─────────────────────────────────────────────────
        newSocket.on("missedMessages", (missed) => {
            console.log(`[Sync] Received ${missed.length} missed messages`);
            
            // Immediately emit delivery acknowledgements grouped by conversation
            const grouped = {};
            missed.forEach(msg => {
                if (!grouped[msg.conversationId]) grouped[msg.conversationId] = [];
                grouped[msg.conversationId].push(msg);
            });
            
            for (const [convId, msgs] of Object.entries(grouped)) {
                const latestMsg = msgs[msgs.length - 1];
                newSocket.emit("messagesDelivered", { conversationId: convId, lastDeliveredMessageId: latestMsg._id });
            }

            // Append to active conversation if applicable
            setMessages((prev) => {
                let updated = [...prev];
                let changed = false;
                
                missed.forEach(msg => {
                    if (conversationId && msg.conversationId === conversationId && !updated.find(m => m._id === msg._id)) {
                        updated.push(msg);
                        changed = true;
                    }
                });
                
                if (changed) {
                    updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                }
                
                return changed ? updated : prev;
            });
        });

        // [6] [Client] Received newMessage
        newSocket.on('newMessage', (message) => {
            console.log(`[6] [Client] Received newMessage:`, message);

            // Check if message belongs to current conversation
            setMessages((prev) => {
                if (prev.find(m => m._id === message._id)) return prev;
                return [...prev, message];
            });

            const senderId = message.sender?._id || message.sender;

            // Auto-scroll logic: scroll if we sent it, or if we are already near the bottom
            if (senderId === user?._id || isScrolledToBottom()) {
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }

            if (!conversationId && (senderId === selectedContact?.contact?._id || senderId === selectedContact?.contact?._id)) {
                setConversationId(message.conversationId);
            }

            // Queue delivery acknowledgement
            if (senderId !== user?._id) {
                queueDeliveryAcks(message.conversationId, message._id);
            }
        });

        // Listen for Read Receipt updates
        newSocket.on('messageStatusUpdated', ({ conversationId: updateConvId, lastDeliveredMessageId, status, userId: updatedUserId }) => {
            setMessages((prev) => prev.map((msg) => {
                // Ignore if from another conversation or msg is newer than the acknowledged one
                if (msg.conversationId !== updateConvId || msg._id > lastDeliveredMessageId) return msg;

                const updated = { ...msg };
                if (!updated.deliveredTo) updated.deliveredTo = [];
                if (!updated.readBy) updated.readBy = [];
                
                if (status === "delivered" && !updated.deliveredTo.includes(updatedUserId)) {
                    updated.deliveredTo.push(updatedUserId);
                }
                return updated;
            }));
        });

        newSocket.on('conversationSeen', ({ conversationId: seenConvId, lastReadMessageId, userId: updatedUserId }) => {
            setMessages((prev) => prev.map((msg) => {
                if (msg.conversationId !== seenConvId || msg._id > lastReadMessageId) return msg;
                
                const msgSender = msg.sender?._id || msg.sender;
                if (msgSender === user?._id) {
                    const updated = { ...msg };
                    if (!updated.deliveredTo) updated.deliveredTo = [];
                    if (!updated.readBy) updated.readBy = [];
                    
                    if (!updated.readBy.includes(updatedUserId)) updated.readBy.push(updatedUserId);
                    if (!updated.deliveredTo.includes(updatedUserId)) updated.deliveredTo.push(updatedUserId);
                    return updated;
                }
                return msg;
            }));
        });

        // Online Status Listener
        newSocket.on('userStatusUpdate', ({ userId, status }) => {
            console.log(`[Status] User ${userId} is now ${status}`);
            setContacts((prev) =>
                prev.map((c) => {
                    if (c.contact?._id === userId) {
                        return {
                            ...c,
                            contact: { ...c.contact, isOnline: status === "online" }
                        };
                    }
                    return c;
                })
            );
        });

        // Typing Indicators
        newSocket.on('userTyping', ({ conversationId: typingConvId, username }) => {
            // Because conversationId in useEffect dependency might be stale in the listener, 
            // we should rely on the state setter's previous state, or just ensure conversationId is in deps.
            // (It is in deps: [selectedContact, conversationId, user])
            if (typingConvId === conversationId) {
                setTypingUsers(prev => {
                    if (!prev.includes(username)) return [...prev, username];
                    return prev;
                });
                
                if (typingTimeoutsRef.current[username]) {
                    clearTimeout(typingTimeoutsRef.current[username]);
                }
                
                typingTimeoutsRef.current[username] = setTimeout(() => {
                    setTypingUsers(prev => prev.filter(u => u !== username));
                    delete typingTimeoutsRef.current[username];
                }, 2000);
            }
        });

        newSocket.on('userStoppedTyping', ({ conversationId: typingConvId, username }) => {
            if (typingConvId === conversationId) {
                setTypingUsers(prev => prev.filter(u => u !== username));
                if (typingTimeoutsRef.current[username]) {
                    clearTimeout(typingTimeoutsRef.current[username]);
                    delete typingTimeoutsRef.current[username];
                }
            }
        });

        newSocket.on('error', (err) => {
            console.error("Socket error:", err);
        });

        return () => newSocket.close();
    }, [selectedContact, conversationId, user]);

    // Fetch contacts on mount
    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            const response = await axios.get(`${API_BASE}/contacts`, { withCredentials: true });
            setContacts(response.data.data);
        } catch (error) {
            console.error("Error fetching contacts:", error);
        } finally {
            setLoadingContacts(false);
        }
    };

    // Load messages when contact is selected
    useEffect(() => {
        if (selectedContact) {
            setMessages([]);
            setPage(1);
            setHasMore(true);
            setConversationId(null);
            setTypingUsers([]);
            checkAndFetchMessages();
            if (myTypingIntervalRef.current) clearInterval(myTypingIntervalRef.current);
            if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
            isTypingRef.current = false;
        }
    }, [selectedContact]);

    const checkAndFetchMessages = async () => {
        if (!selectedContact) return;
        setLoadingMessages(true);
        try {
            // First check if a conversation already exists
            const convRes = await axios.get(`${API_BASE}/messages/conversation/${selectedContact.contact._id}`, { withCredentials: true });
            const cid = convRes.data.data.conversationId;

            if (cid) {
                setConversationId(cid);
                await fetchMessages(cid, 1);
            } else {
                setLoadingMessages(false);
            }
        } catch (error) {
            console.error("Error checking conversation:", error);
            setLoadingMessages(false);
        }
    };

    const fetchMessages = async (cid, pageNum) => {
        try {
            const response = await axios.get(`${API_BASE}/messages/${cid}?page=${pageNum}&limit=50`, { withCredentials: true });
            const newMessages = response.data.data;

            if (newMessages.length < 50) {
                setHasMore(false);
            }

            setMessages((prev) => pageNum === 1 ? newMessages : [...newMessages, ...prev]);

            if (pageNum === 1) {
                setTimeout(scrollToBottom, 100);
                if (socket) {
                    socket.emit("messagesSeen", { conversationId: cid });
                }
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const loadMoreMessages = () => {
        if (!hasMore || loadingMessages) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchMessages(conversationId, nextPage);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // [1] [Client] Emitting sendMessage
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact || !socket) return;

        const messageData = {
            recipientId: selectedContact.contact._id,
            content: newMessage.trim(),
            messageType: "text"
        };

        console.log(`[1] [Client] Emitting sendMessage:`, messageData);
        socket.emit('sendMessage', messageData);
        
        // Stop typing immediately
        if (conversationId && isTypingRef.current) {
            socket.emit("stopTyping", {
                conversationId,
                participantIds: [selectedContact.contact._id]
            });
            isTypingRef.current = false;
            if (myTypingTimeoutRef.current) {
                clearTimeout(myTypingTimeoutRef.current);
            }
            if (myTypingIntervalRef.current) {
                clearInterval(myTypingIntervalRef.current);
            }
        }
        
        setNewMessage('');
    };

    const myTypingTimeoutRef = useRef(null);
    const myTypingIntervalRef = useRef(null);
    const isTypingRef = useRef(false);

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!socket || !conversationId) return;

        if (!isTypingRef.current) {
            isTypingRef.current = true;
            // Emit instantly on first keystroke
            socket.emit("startTyping", {
                conversationId,
                participantIds: [selectedContact.contact._id]
            });
            // Start heartbeat interval
            myTypingIntervalRef.current = setInterval(() => {
                socket.emit("startTyping", {
                    conversationId,
                    participantIds: [selectedContact.contact._id]
                });
            }, 800);
        }

        // Reset the inactivity timeout on every keystroke
        if (myTypingTimeoutRef.current) {
            clearTimeout(myTypingTimeoutRef.current);
        }

        myTypingTimeoutRef.current = setTimeout(() => {
            // User inactive for 1.5s
            isTypingRef.current = false;
            if (myTypingIntervalRef.current) {
                clearInterval(myTypingIntervalRef.current);
            }
            socket.emit("stopTyping", {
                conversationId,
                participantIds: [selectedContact.contact._id]
            });
        }, 1500);
    };

    const handleContactAdded = (newContact) => {
        setContacts((prev) => [newContact, ...prev]);
    };

    const handleDeleteClick = (e, contact) => {
        e.stopPropagation();
        setContactToDelete(contact);
        setShowDeleteDialog(true);
    };

    const handleDeleteConfirm = async () => {
        if (!contactToDelete) return;
        try {
            await axios.delete(`${API_BASE}/contacts/${contactToDelete._id}`, { withCredentials: true });
            setContacts((prev) => prev.filter((c) => c._id !== contactToDelete._id));
            if (selectedContact?._id === contactToDelete._id) {
                setSelectedContact(null);
            }
        } catch (error) {
            console.error("Error deleting contact:", error);
        } finally {
            setShowDeleteDialog(false);
            setContactToDelete(null);
        }
    };

    const filteredContacts = contacts.filter((c) => {
        const name = c.contact?.username || '';
        const email = c.contact?.email || '';
        const query = searchQuery.toLowerCase();
        return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
    });

    const getInitials = (name) => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };

    const getAvatarColor = (name) => {
        const colors = [
            'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500',
            'from-green-500 to-emerald-500', 'from-orange-500 to-amber-500',
            'from-red-500 to-rose-500', 'from-indigo-500 to-violet-500',
            'from-teal-500 to-green-500', 'from-fuchsia-500 to-purple-500',
        ];
        let hash = 0;
        for (let i = 0; i < name?.length || 0; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="h-screen w-full flex bg-[#050505] overflow-hidden">
            {/* ── LEFT SIDEBAR ─────────────────────────────────── */}
            <div className="w-[380px] min-w-[320px] border-r border-white/10 flex flex-col bg-[#0a0a14]">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(user?.username)} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                            {getInitials(user?.username)}
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">{user?.username}</p>
                            <p className="text-gray-500 text-xs">{user?.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setShowAddModal(true)} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors group">
                            <UserPlus className="w-4.5 h-4.5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                        </button>
                        <button onClick={logout} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors group">
                            <LogOut className="w-4.5 h-4.5 text-gray-400 group-hover:text-red-400 transition-colors" />
                        </button>
                    </div>
                </div>

                <div className="px-3 py-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loadingContacts ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        filteredContacts.map((contact) => {
                            const contactUser = contact.contact;
                            const isSelected = selectedContact?._id === contact._id;
                            return (
                                <div
                                    key={contact._id}
                                    onClick={() => setSelectedContact(contact)}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-white/5 group
                                        ${isSelected ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'hover:bg-white/5 border-l-2 border-l-transparent'}`}
                                >
                                    <div className="relative">
                                        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarColor(contactUser?.username)} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
                                            {getInitials(contactUser?.username)}
                                        </div>
                                        {contactUser?.isOnline && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0a0a14] rounded-full shadow-lg" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium text-sm truncate">{contactUser?.username}</p>
                                        <p className="text-gray-500 text-xs truncate">{contactUser?.email}</p>
                                    </div>
                                    <button onClick={(e) => handleDeleteClick(e, contact)} className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center transition-all">
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL (Chat Area) ──────────────────────── */}
            <div className="flex-1 flex flex-col bg-[#050510]">
                {selectedContact ? (
                    <>
                        <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between bg-[#0a0a14]">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(selectedContact.contact?.username)} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                                    {getInitials(selectedContact.contact?.username)}
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">{selectedContact.contact?.username}</p>
                                    <div className="flex items-center gap-1.5 h-4">
                                        {typingUsers.length > 0 ? (
                                            <motion.p 
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-emerald-400 text-[10px] font-medium tracking-wide italic"
                                            >
                                                {typingUsers.join(" / ")} typing...
                                            </motion.p>
                                        ) : (
                                            <>
                                                <div className={`w-1.5 h-1.5 rounded-full ${contacts.find(c => c._id === selectedContact._id)?.contact?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                                                <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">
                                                    {contacts.find(c => c._id === selectedContact._id)?.contact?.isOnline ? 'Online' : 'Offline'}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
                                <MoreVertical className="w-4.5 h-4.5 text-gray-400" />
                            </button>
                        </div>

                        <div ref={chatContainerRef} onScroll={evaluateReadReceipts} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {hasMore && conversationId && (
                                <button
                                    onClick={loadMoreMessages}
                                    className="w-full py-2 text-blue-400 text-xs hover:underline flex items-center justify-center gap-1"
                                >
                                    <ChevronDown className="w-3 h-3 rotate-180" /> Load older messages
                                </button>
                            )}

                            {messages.length === 0 && !loadingMessages && (
                                <div className="text-center py-20 text-gray-600 text-sm italic">
                                    No messages yet. Say hi!
                                </div>
                            )}

                            {messages.map((msg, idx) => {
                                const isMe = (msg.sender?._id || msg.sender) === user._id;
                                return (
                                    <div key={msg._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-lg ${isMe
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-white/10 text-gray-100 rounded-tl-none'
                                            }`}>
                                            <p className="text-sm font-light leading-relaxed">{msg.content}</p>
                                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-blue-100/60' : 'text-gray-500'}`}>
                                                <p className="text-[10px]">
                                                    {formatTime(msg.createdAt)}
                                                </p>
                                                {isMe && (
                                                    <span>
                                                        {(msg.readBy && msg.readBy.some(id => id !== user._id)) ? (
                                                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                                                        ) : (msg.deliveredTo && msg.deliveredTo.some(id => id !== user._id)) ? (
                                                            <CheckCheck className="w-3.5 h-3.5 text-gray-300" />
                                                        ) : (
                                                            <Check className="w-3 h-3 text-gray-300" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="px-4 py-3 border-t border-white/10 bg-[#0a0a14]">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                    value={newMessage}
                                    onChange={handleTyping}
                                />
                                <button
                                    type="submit"
                                    className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-lg hover:brightness-110 transition-all"
                                >
                                    <Send className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 flex items-center justify-center mx-auto mb-6">
                                <MessageSquare className="w-12 h-12 text-blue-400/30" />
                            </div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">RelayMesh</h2>
                            <p className="text-gray-500 text-sm">Select a contact to start chatting</p>
                        </div>
                    </div>
                )}
            </div>

            <AddContactModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onContactAdded={handleContactAdded} />
            <DeleteContactDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={handleDeleteConfirm} contactName={contactToDelete?.contact?.username || ''} />
        </div>
    );
};

export default Home;
