import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis, setUserOnline, removeUserOnline, isUserOnline } from "./utils/redis.utils.js";
import { socketAuth } from "./middlewares/socket.auth.middleware.js";
import { ConversationModel } from "./models/conversation.model.js";
import { MessageModel } from "./models/message.model.js";

/**
 * Initializes Socket.io and attaches it to the HTTP server
 * @param {import('http').Server} server 
 */
export const initializeSocket = (server) => {
    // Redis adapter pub/sub clients
    const pubClient = redis;
    const subClient = redis.duplicate();

    subClient.on("error", (err) => {
        console.error("Redis subClient error:", err.message);
    });

    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || ["http://localhost:5173", "http://localhost:5174", "http://192.168.1.7:5173", "http://192.168.1.7:5174"],
            methods: ["GET", "POST"],
            credentials: true
        },
        adapter: createAdapter(pubClient, subClient)
    });

    // Use Socket.io authentication middleware
    io.use(socketAuth);

    io.on("connection", async (socket) => {
        const userId = socket.user._id.toString();
        console.log(`User connected: ${socket.user.username} (${userId})`);

        // Join a personal room named after the userId for targeted messaging across servers
        socket.join(userId);

        // Track online status in Redis
        await setUserOnline(userId, socket.id);

        // Broadcast online status to all other users
        socket.broadcast.emit("userStatusUpdate", { userId, status: "online" });
        console.log(`[Status] User ${socket.user.username} is online`);

        // ─────────────────────────────────────────────────
        // [1] Offline Message Synchronization
        // ─────────────────────────────────────────────────
        try {
            const userConversations = await ConversationModel.find({ participants: userId }).select('_id');
            const conversationIds = userConversations.map(c => c._id);
            
            const missedMessages = await MessageModel.find({
                conversationId: { $in: conversationIds },
                sender: { $ne: userId },
                deliveredTo: { $ne: userId }
            }).sort({ createdAt: 1 }).limit(50).populate('sender', 'username avatar');
            
            if (missedMessages.length > 0) {
                console.log(`[Sync] Pushing ${missedMessages.length} missed messages to ${socket.user.username}`);
                socket.emit("missedMessages", missedMessages);
            }
        } catch (error) {
            console.error("Error syncing missed messages:", error.message);
        }

        // ─────────────────────────────────────────────────
        // [2] [Server] Received sendMessage
        // ─────────────────────────────────────────────────
        socket.on("sendMessage", async (data) => {
            const { recipientId, content, messageType = "text" } = data;

            console.log(`[2] [Server] Received sendMessage from ${socket.user.username} to ${recipientId}`);

            try {
                if (!recipientId || !content) return;

                // [3] Find or create private conversation
                let conversation = await ConversationModel.findOne({
                    type: "private",
                    participants: { $all: [userId, recipientId] }
                });

                if (!conversation) {
                    conversation = await ConversationModel.create({
                        type: "private",
                        participants: [userId, recipientId],
                        createdBy: userId
                    });
                    console.log(`[3] [Server] New private conversation created: ${conversation._id}`);
                } else {
                    console.log(`[3] [Server] Existing conversation found: ${conversation._id}`);
                }

                // [4] Save Message to DB
                const message = await MessageModel.create({
                    conversationId: conversation._id,
                    sender: userId,
                    messageType,
                    content,
                    deliveredTo: [userId], // Sender already has it
                });

                // Update lastMessage in conversation
                conversation.lastMessage = message._id;
                await conversation.save();

                console.log(`[4] [Server] Message saved to DB: ${message._id}`);

                // [5] Emit newMessage to both participants' rooms
                const payload = {
                    ...message.toObject(),
                    sender: {
                        _id: socket.user._id,
                        username: socket.user.username,
                        avatar: socket.user.avatar
                    }
                };

                // Emit to the conversation room (joined on client side) or specific user rooms
                // Using personal rooms ensures delivery across distributed servers
                io.to(userId).to(recipientId).emit("newMessage", payload);

                console.log(`[5] [Server] Emitted newMessage to users: ${userId}, ${recipientId}`);

            } catch (error) {
                console.error("Socket error (sendMessage):", error.message);
                socket.emit("error", { message: "Failed to send message" });
            }
        });

        // ─────────────────────────────────────────────────
        // Typing Indicators
        // ─────────────────────────────────────────────────
        socket.on("startTyping", (data) => {
            const { conversationId, participantIds } = data;
            if (conversationId && Array.isArray(participantIds)) {
                participantIds.forEach(pId => {
                    if (pId !== userId) {
                        io.to(pId).emit("userTyping", { 
                            conversationId, 
                            username: socket.user.username 
                        });
                    }
                });
            }
        });

        socket.on("stopTyping", (data) => {
            const { conversationId, participantIds } = data;
            if (conversationId && Array.isArray(participantIds)) {
                participantIds.forEach(pId => {
                    if (pId !== userId) {
                        io.to(pId).emit("userStoppedTyping", { 
                            conversationId, 
                            username: socket.user.username 
                        });
                    }
                });
            }
        });

        // ─────────────────────────────────────────────────
        // Read Receipts (Ticks)
        // ─────────────────────────────────────────────────
        socket.on("messagesDelivered", async (data) => {
            const { conversationId, lastDeliveredMessageId } = data;
            if (!conversationId || !lastDeliveredMessageId) return;

            try {
                // Update DB efficiently: mark all un-delivered messages up to lastDeliveredMessageId
                const filter = {
                    conversationId,
                    sender: { $ne: userId },
                    deliveredTo: { $ne: userId },
                    _id: { $lte: lastDeliveredMessageId }
                };

                const result = await MessageModel.updateMany(
                    filter,
                    { $addToSet: { deliveredTo: userId } }
                );

                // Only emit if documents were actually modified
                if (result.modifiedCount > 0) {
                    const conversation = await ConversationModel.findById(conversationId);
                    if (conversation) {
                        conversation.participants.forEach(p => {
                            const pId = p.toString();
                            if (pId !== userId) {
                                // Keep original event name, update payload for batching
                                io.to(pId).emit("messageStatusUpdated", {
                                    conversationId,
                                    lastDeliveredMessageId,
                                    status: "delivered",
                                    userId
                                });
                            }
                        });
                    }
                }
                console.log(`[Status] Messages delivered to ${userId} up to ${lastDeliveredMessageId} (${result.modifiedCount} updated)`);
            } catch (error) {
                console.error("Error updating messagesDelivered:", error.message);
            }
        });

        socket.on("messagesSeen", async (data) => {
            const { conversationId, lastReadMessageId } = data;
            if (!conversationId || !lastReadMessageId) return;

            try {
                // Find messages not sent by user and not read by user up to lastReadMessageId
                const filter = {
                    conversationId,
                    sender: { $ne: userId },
                    readBy: { $ne: userId },
                    _id: { $lte: lastReadMessageId }
                };

                const result = await MessageModel.updateMany(
                    filter,
                    { 
                        $addToSet: { readBy: userId, deliveredTo: userId } 
                    }
                );

                if (result.modifiedCount > 0) {
                    // Fetch the conversation participants to notify them
                    const conversation = await ConversationModel.findById(conversationId);
                    if (conversation) {
                        conversation.participants.forEach(p => {
                            const pId = p.toString();
                            if (pId !== userId) {
                                io.to(pId).emit("conversationSeen", {
                                    conversationId,
                                    lastReadMessageId,
                                    userId
                                });
                            }
                        });
                    }
                }
                console.log(`[Status] Conversation ${conversationId} seen by ${userId} up to ${lastReadMessageId} (${result.modifiedCount} updated)`);
            } catch (error) {
                console.error("Error updating messagesSeen:", error.message);
            }
        });

        socket.on("disconnect", async () => {
            console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
            await removeUserOnline(userId, socket.id);

            // Re-check if user is truly offline (no more active sockets)
            const stillOnline = await isUserOnline(userId);
            if (!stillOnline) {
                io.emit("userStatusUpdate", { userId, status: "offline" });
                console.log(`[Status] User ${socket.user.username} is offline`);
            }
        });
    });

    return io;
};
