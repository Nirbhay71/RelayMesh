import { ConversationModel } from "../../models/conversation.model.js";
import { MessageModel } from "../../models/message.model.js";
import { setUserOnline, removeUserOnline, isUserOnline } from "../../utils/redis.utils.js";
import { trackSocketConnection, trackSocketDisconnection } from "../../utils/socket-metrics.js";

export const handleConnection = async (io, socket) => {
    trackSocketConnection();

    const userId = socket.user._id.toString();
    console.log(`User connected: ${socket.user.username} (${userId})`);

    socket.join(userId);
    await setUserOnline(userId, socket.id);
    socket.broadcast.emit("userStatusUpdate", { userId, status: "online" });
    console.log(`[Status] User ${socket.user.username} is online`);

    await syncOfflineMessages(socket, userId);
};

export const handleDisconnect = async (io, socket, userId) => {
    console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
    trackSocketDisconnection();
    await removeUserOnline(userId, socket.id);

    const stillOnline = await isUserOnline(userId);
    if (!stillOnline) {
        io.emit("userStatusUpdate", { userId, status: "offline" });
        console.log(`[Status] User ${socket.user.username} is offline`);
    }
};

const syncOfflineMessages = async (socket, userId) => {
    try {
        const userConversations = await ConversationModel.find({ participants: userId }).select("_id");
        const conversationIds = userConversations.map((c) => c._id);

        const missedMessages = await MessageModel.find({
            conversationId: { $in: conversationIds },
            sender: { $ne: userId },
            deliveredTo: { $ne: userId },
        })
            .sort({ createdAt: 1 })
            .limit(50)
            .populate("sender", "username avatar");

        if (missedMessages.length > 0) {
            console.log(`[Sync] Pushing ${missedMessages.length} missed messages to ${socket.user.username}`);
            socket.emit("missedMessages", missedMessages);
        }
    } catch (error) {
        console.error("Error syncing missed messages:", error.message);
    }
};
