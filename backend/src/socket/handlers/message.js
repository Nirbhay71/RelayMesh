import { ConversationModel } from "../../models/conversation.model.js";
import { MessageModel } from "../../models/message.model.js";
import { trackSocketEvent, trackMessageSent } from "../../utils/socket-metrics.js";

export const registerMessageHandlers = (io, socket, userId) => {
    socket.on(
        "sendMessage",
        trackSocketEvent("sendMessage", async (data) => {
            await handleSendMessage(io, socket, userId, data);
        })
    );
};

const handleSendMessage = async (io, socket, userId, data) => {
    const { recipientId, content, messageType = "text" } = data;

    console.log(`[sendMessage] Received from ${socket.user.username} to ${recipientId}`);

    try {
        if (!recipientId || !content) return;

        let conversation = await ConversationModel.findOne({
            type: "private",
            participants: { $all: [userId, recipientId] },
        });

        if (!conversation) {
            conversation = await ConversationModel.create({
                type: "private",
                participants: [userId, recipientId],
                createdBy: userId,
            });
            console.log(`[sendMessage] New conversation created: ${conversation._id}`);
        } else {
            console.log(`[sendMessage] Existing conversation found: ${conversation._id}`);
        }

        const message = await MessageModel.create({
            conversationId: conversation._id,
            sender: userId,
            messageType,
            content,
            deliveredTo: [userId],
        });

        conversation.lastMessage = message._id;
        await conversation.save();

        console.log(`[sendMessage] Saved to DB: ${message._id}`);

        const payload = {
            ...message.toObject(),
            sender: {
                _id: socket.user._id,
                username: socket.user.username,
                avatar: socket.user.avatar,
            },
        };

        trackMessageSent();
        io.to(userId).to(recipientId).emit("newMessage", payload);

        console.log(`[sendMessage] Emitted to users: ${userId}, ${recipientId}`);
    } catch (error) {
        console.error("Socket error (sendMessage):", error.message);
        socket.emit("error", { message: "Failed to send message" });
    }
};
