import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
    Settings,
    Star,
    ChevronDown,
    ArrowLeft,
    Check,
    CheckCheck,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:7000";

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
    for (let i = 0; i < (name?.length || 0); i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Home = () => {
    const { user, logout } = useAuth();
    const [contacts, setContacts] = useState([]);
    const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'contacts' | 'settings'
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

    // Contacts are one-way (see backend Contact model) — a message from someone
    // who hasn't been added yet would otherwise have no sidebar entry to open it
    // from. This keeps the sidebar's per-contact preview/unread/ordering in sync
    // with every message sent or received, live.
    const updateSidebarForMessage = (message, isIncoming) => {
        const senderId = message.sender?._id || message.sender;
        const otherUserId = isIncoming ? senderId : selectedContact?.contact?._id;
        if (!otherUserId) return;

        setContacts((prev) => {
            const idx = prev.findIndex((c) => c.contact?._id === otherUserId);
            const isOpen = selectedContact?.contact?._id === otherUserId;

            if (idx === -1) {
                // Brand new sender we've never seen before — only happens for incoming messages
                if (!isIncoming || !message.sender || typeof message.sender !== 'object') return prev;
                return [{
                    _id: `conv-${message.conversationId}`,
                    contact: { ...message.sender, isOnline: true },
                    isFromConversation: true,
                    starred: false,
                    conversationId: message.conversationId,
                    lastMessage: message,
                    unreadCount: isOpen ? 0 : 1,
                    updatedAt: message.createdAt,
                }, ...prev];
            }

            const existing = prev[idx];
            const updatedEntry = {
                ...existing,
                conversationId: existing.conversationId || message.conversationId,
                lastMessage: message,
                unreadCount: isIncoming && !isOpen ? (existing.unreadCount || 0) + 1 : (isOpen ? 0 : existing.unreadCount || 0),
                updatedAt: message.createdAt,
            };
            const rest = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
            return [updatedEntry, ...rest];
        });
    };

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

            // Surface senders in the sidebar even if not yet added as contacts
            missed.forEach((msg) => updateSidebarForMessage(msg, true));

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

            const senderId = message.sender?._id || message.sender;
            const isForOpenConversation = conversationId
                ? message.conversationId === conversationId
                : senderId === selectedContact?.contact?._id;

            // Only append to the thread that's actually open — otherwise a message
            // from an unrelated conversation would bleed into whatever chat is on screen
            if (isForOpenConversation) {
                setMessages((prev) => {
                    if (prev.find(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });

                if (!conversationId) setConversationId(message.conversationId);

                // Auto-scroll logic: scroll if we sent it, or if we are already near the bottom
                if (senderId === user?._id || isScrolledToBottom()) {
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                }
            }

            if (senderId === user?._id) {
                updateSidebarForMessage(message, false);
            } else {
                updateSidebarForMessage(message, true);
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

    // Fetch sidebar (contacts + conversations, merged and unread-annotated) on mount
    useEffect(() => {
        fetchSidebar();
    }, []);

    const fetchSidebar = async () => {
        try {
            const response = await axios.get(`${API_BASE}/contacts/sidebar`, { withCredentials: true });
            setContacts(response.data.data);
        } catch (error) {
            console.error("Error fetching sidebar:", error);
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
        if (!newContact || !newContact.contact?._id) return;
        setContacts((prev) => {
            const newUserId = newContact.contact._id.toString();
            const filtered = prev.filter((c) => c.contact?._id?.toString() !== newUserId && c._id?.toString() !== newContact._id?.toString());
            return [newContact, ...filtered];
        });
    };

    const handleSelectContact = (item) => {
        setSelectedContact(item);
        if (item.unreadCount) {
            setContacts((prev) => prev.map((c) => c._id === item._id ? { ...c, unreadCount: 0 } : c));
        }
    };

    const handleToggleStar = async (e, item) => {
        e.stopPropagation();
        try {
            let contactId = item._id;
            if (item.isFromConversation) {
                // Not a saved contact yet — starring implicitly saves them too
                const addRes = await axios.post(`${API_BASE}/contacts/add`, { contactUserId: item.contact._id }, { withCredentials: true });
                contactId = addRes.data.data._id;
            }
            const starRes = await axios.patch(`${API_BASE}/contacts/${contactId}/star`, {}, { withCredentials: true });
            setContacts((prev) => prev.map((c) => (
                c.contact?._id === item.contact._id
                    ? { ...c, _id: contactId, isFromConversation: false, starred: starRes.data.data.starred }
                    : c
            )));
        } catch (error) {
            console.error("Toggle star error:", error);
        }
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

    const getLastMessagePreview = (item) => {
        if (!item.lastMessage) return item.contact?.email || '';
        const senderId = item.lastMessage.sender?._id || item.lastMessage.sender;
        const prefix = senderId === user?._id ? 'You: ' : '';
        const body = item.lastMessage.messageType && item.lastMessage.messageType !== 'text'
            ? `[${item.lastMessage.messageType}]`
            : (item.lastMessage.content || '');
        return `${prefix}${body}`;
    };

    const query = searchQuery.toLowerCase();
    const matchesQuery = (c) => {
        const name = c.contact?.username || '';
        const email = c.contact?.email || '';
        return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
    };

    const filteredContacts = contacts.filter(matchesQuery);
    const starredContacts = filteredContacts.filter((c) => c.starred);
    const regularContacts = filteredContacts.filter((c) => !c.starred);
    const totalUnread = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    const savedContactsList = contacts
        .filter((c) => !c.isFromConversation)
        .filter(matchesQuery)
        .sort((a, b) => (a.contact?.username || '').localeCompare(b.contact?.username || ''));

    const renderContactRow = (item, { showMeta = true, keyPrefix = 'c' } = {}) => {
        const contactUser = item.contact;
        const isSelected = selectedContact?.contact?._id === contactUser?._id;
        const keyVal = `${keyPrefix}-${item._id || contactUser?._id}`;
        return (
            <div
                key={keyVal}
                onClick={() => handleSelectContact(item)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-white/5 group
                    ${isSelected ? 'bg-[#3B82F6]/[0.12] border-l-2 border-l-[#3B82F6]' : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'}`}
            >
                <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarColor(contactUser?.username)} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                        {getInitials(contactUser?.username)}
                    </div>
                    {contactUser?.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#3B82F6] border-2 border-[#111114] rounded-full shadow-lg" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-white font-medium text-sm truncate">{contactUser?.username}</p>
                        {showMeta && item.updatedAt && (
                            <span className="text-gray-500 text-[10px] flex-shrink-0">{formatRelativeTime(item.updatedAt)}</span>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-gray-500 text-xs truncate">{showMeta ? getLastMessagePreview(item) : contactUser?.email}</p>
                        {showMeta && item.unreadCount > 0 && (
                            <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#3B82F6] text-white text-[10px] font-semibold flex items-center justify-center">
                                {item.unreadCount > 99 ? '99+' : item.unreadCount}
                            </span>
                        )}
                    </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center flex-shrink-0">
                    <button onClick={(e) => handleToggleStar(e, item)} className="w-8 h-8 rounded-lg hover:bg-amber-400/10 flex items-center justify-center">
                        <Star className={`w-4 h-4 ${item.starred ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
                    </button>
                    {!item.isFromConversation && (
                        <button onClick={(e) => handleDeleteClick(e, item)} className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center">
                            <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderRailButton = (Icon, label, isActive, onClick, badgeCount) => (
        <button
            key={label}
            onClick={onClick}
            title={label}
            className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-[#3B82F6] text-white' : 'text-gray-500 hover:bg-white/10 hover:text-gray-300'}`}
        >
            <Icon className="w-5 h-5" />
            {badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {badgeCount > 9 ? '9+' : badgeCount}
                </span>
            )}
        </button>
    );

    return (
        <div className="h-[100dvh] w-full flex bg-[#0a0a0c] overflow-hidden">
            {/* ── LEFT: icon rail + list panel, hidden together on mobile when a chat is open ── */}
            <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} h-full`}>
                {/* Icon rail */}
                <div className="w-16 flex-shrink-0 flex flex-col items-center py-5 gap-2 bg-[#0a0a0c] border-r border-white/[0.06]">
                    {renderRailButton(MessageSquare, 'Chats', activeTab === 'chats', () => setActiveTab('chats'), totalUnread)}
                    {renderRailButton(Users, 'Contacts', activeTab === 'contacts', () => setActiveTab('contacts'))}
                    {renderRailButton(Settings, 'Settings', activeTab === 'settings', () => setActiveTab('settings'))}
                    <div className="flex-1" />
                    <button onClick={logout} title="Log out" className="w-11 h-11 rounded-xl hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>

                {/* List panel */}
                <div className="w-[calc(100vw-4rem)] sm:w-[320px] md:w-[340px] border-r border-white/10 flex flex-col bg-[#111114]">
                    {activeTab === 'chats' && (
                        <>
                            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(user?.username)} flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0`}>
                                        {getInitials(user?.username)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-semibold text-sm truncate">{user?.username}</p>
                                        <p className="text-gray-500 text-xs truncate">{user?.email}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAddModal(true)} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors group flex-shrink-0">
                                    <UserPlus className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#60A5FA] transition-colors" />
                                </button>
                            </div>

                            <div className="px-3 py-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search chats..."
                                        className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl py-2.5 pl-9 pr-4 text-white text-base sm:text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#3B82F6]/50 transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Quick-access avatar row */}
                            <div className="px-3 py-1 flex items-center gap-3 overflow-x-auto no-scrollbar">
                                <button onClick={() => setShowAddModal(true)} className="flex flex-col items-center gap-1 flex-shrink-0 w-14">
                                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-gray-400 hover:border-[#3B82F6] hover:text-[#60A5FA] transition-colors">
                                        <UserPlus className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] text-gray-500">Add</span>
                                </button>
                                {starredContacts.map((item) => (
                                    <button key={`quick-${item._id}`} onClick={() => handleSelectContact(item)} className="flex flex-col items-center gap-1 flex-shrink-0 w-14">
                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(item.contact?.username)} flex items-center justify-center text-white font-bold text-sm ring-2 ring-[#3B82F6]/60`}>
                                                {getInitials(item.contact?.username)}
                                            </div>
                                            {item.contact?.isOnline && (
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#3B82F6] border-2 border-[#111114] rounded-full" />
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-400 truncate w-full text-center">{item.contact?.username}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar mt-1">
                                {loadingContacts ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="w-8 h-8 border-2 border-[#3B82F6]/20 border-t-[#3B82F6] rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <>
                                        {!searchQuery && starredContacts.length > 0 && (
                                            <>
                                                <div className="px-4 pt-2 pb-1.5">
                                                    <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">Starred</span>
                                                </div>
                                                {starredContacts.map((item) => renderContactRow(item, { keyPrefix: 'starred' }))}
                                            </>
                                        )}

                                        <div className="px-4 pt-2 pb-1.5 flex items-center justify-between">
                                            <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                                                {searchQuery ? 'Results' : 'Messages'}
                                            </span>
                                            {!searchQuery && totalUnread > 0 && (
                                                <span className="text-[#60A5FA] text-[11px] font-medium">{totalUnread} unread</span>
                                            )}
                                        </div>

                                        {(searchQuery ? filteredContacts : regularContacts).length === 0 ? (
                                            <div className="text-center py-12 text-gray-600 text-sm px-6">
                                                {searchQuery ? 'No matches found.' : 'No conversations yet.'}
                                            </div>
                                        ) : (
                                            (searchQuery ? filteredContacts : regularContacts).map((item) => renderContactRow(item))
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'contacts' && (
                        <>
                            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                <span className="text-white font-semibold text-sm">Contacts</span>
                                <button onClick={() => setShowAddModal(true)} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors group">
                                    <UserPlus className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#60A5FA] transition-colors" />
                                </button>
                            </div>
                            <div className="px-3 py-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search contacts..."
                                        className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl py-2.5 pl-9 pr-4 text-white text-base sm:text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#3B82F6]/50 transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {loadingContacts ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="w-8 h-8 border-2 border-[#3B82F6]/20 border-t-[#3B82F6] rounded-full animate-spin"></div>
                                    </div>
                                ) : savedContactsList.length === 0 ? (
                                    <div className="text-center py-12 text-gray-600 text-sm px-6">
                                        No saved contacts yet.
                                    </div>
                                ) : (
                                    savedContactsList.map((item) => renderContactRow(item, { showMeta: false, keyPrefix: 'directory' }))
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'settings' && (
                        <>
                            <div className="px-4 py-3 border-b border-white/10">
                                <span className="text-white font-semibold text-sm">Settings</span>
                            </div>
                            <div className="p-6 flex flex-col items-center text-center border-b border-white/10">
                                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getAvatarColor(user?.username)} flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-3`}>
                                    {getInitials(user?.username)}
                                </div>
                                <p className="text-white font-semibold">{user?.username}</p>
                                <p className="text-gray-500 text-sm">{user?.email}</p>
                            </div>
                            <div className="p-4">
                                <button onClick={logout} className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium py-2.5 rounded-xl transition-all">
                                    <LogOut className="w-4 h-4" /> Log Out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL (Chat Area) ──────────────────────── */}
            <div className={`flex-1 flex-col bg-[#0a0a0c] min-w-0 ${selectedContact ? 'flex' : 'hidden md:flex'}`}>
                {selectedContact ? (
                    <>
                        <div className="px-3 sm:px-6 py-3 border-b border-white/10 flex items-center justify-between bg-[#111114]">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <button
                                    onClick={() => setSelectedContact(null)}
                                    className="md:hidden w-9 h-9 -ml-1 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
                                >
                                    <ArrowLeft className="w-5 h-5 text-gray-300" />
                                </button>
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(selectedContact.contact?.username)} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
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
                                                <div className={`w-1.5 h-1.5 rounded-full ${contacts.find(c => c.contact?._id === selectedContact.contact?._id)?.contact?.isOnline ? 'bg-[#3B82F6] animate-pulse' : 'bg-gray-500'}`} />
                                                <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">
                                                    {contacts.find(c => c.contact?._id === selectedContact.contact?._id)?.contact?.isOnline ? 'Online' : 'Offline'}
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

                        {/* Top banner if not in contacts */}
                        {selectedContact.contact?._id && !contacts.some(c => c.contact?._id === selectedContact.contact?._id && !c.isFromConversation) && (
                            <div className="bg-[#3B82F6]/10 border-b border-[#3B82F6]/20 px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
                                <p className="text-gray-300 text-xs min-w-0">
                                    <span className="font-semibold text-white">{selectedContact.contact?.username}</span> is not in your contacts list.
                                </p>
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await axios.post(`${API_BASE}/contacts/add`, { contactUserId: selectedContact.contact?._id }, { withCredentials: true });
                                            handleContactAdded(res.data.data);
                                        } catch (e) {
                                            console.error("Add contact error:", e);
                                        }
                                    }}
                                    className="text-xs bg-[#3B82F6] hover:bg-[#2563EB] text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-medium shadow-sm"
                                >
                                    <UserPlus className="w-3.5 h-3.5" /> Add Contact
                                </button>
                            </div>
                        )}

                        <div ref={chatContainerRef} onScroll={evaluateReadReceipts} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 custom-scrollbar">
                            {hasMore && conversationId && (
                                <button
                                    onClick={loadMoreMessages}
                                    className="w-full py-2 text-[#60A5FA]/70 text-xs hover:text-[#60A5FA] flex items-center justify-center gap-1"
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
                                        <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 shadow-lg ${isMe
                                            ? 'bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white rounded-tr-sm'
                                            : 'bg-[#26262A] text-gray-100 rounded-tl-none'
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

                        <form onSubmit={handleSendMessage} className="px-3 sm:px-4 py-3 border-t border-white/10 bg-[#111114]" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white text-base sm:text-sm focus:outline-none focus:border-[#3B82F6]/50 transition-all font-light"
                                    value={newMessage}
                                    onChange={handleTyping}
                                />
                                <button
                                    type="submit"
                                    className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] flex items-center justify-center shadow-lg hover:brightness-110 transition-all"
                                >
                                    <Send className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#3B82F6]/10 to-[#3B82F6]/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                                <MessageSquare className="w-12 h-12 text-[#60A5FA]/30" />
                            </div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#3B82F6] to-[#2563EB] bg-clip-text text-transparent mb-2">RelayMesh</h2>
                            <p className="text-gray-500 text-sm">Select a contact to start chatting</p>
                        </div>
                    </div>
                )}
            </div>

            <AddContactModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onContactAdded={handleContactAdded}
                onSelectContact={(selected) => {
                    if (selected) {
                        if (selected._id && selected.contact?._id) {
                            handleContactAdded(selected);
                        }
                        setSelectedContact(selected);
                    }
                    setShowAddModal(false);
                }}
            />
            <DeleteContactDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={handleDeleteConfirm} contactName={contactToDelete?.contact?.username || ''} />
        </div>
    );
};

export default Home;
