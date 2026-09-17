import { ConversationModel } from "../../models/conversation.model.js";
import { MessageModel } from "../../models/message.model.js";
import { trackMessageDelivery, trackMessageSeen } from "../../utils/socket-metrics.js";

export const registerReceiptHandlers = (io, socket, userId) => {
    socket.on("messagesDelivered", async (data) => {
        await handleMessagesDelivered(io, socket, userId, data);
    });

    socket.on("messagesSeen", async (data) => {
        await handleMessagesSeen(io, socket, userId, data);
    });
};

const handleMessagesDelivered = async (io, socket, userId, data) => {
    const { conversationId, lastDeliveredMessageId } = data;

    if (!conversationId || !lastDeliveredMessageId) return;

    try {
        const filter = {
            conversationId,
            sender: { $ne: userId },
            deliveredTo: { $ne: userId },
            _id: { $lte: lastDeliveredMessageId },
        };

        const result = await MessageModel.updateMany(filter, {
            $addToSet: { deliveredTo: userId },
        });

        if (result.modifiedCount > 0) {
            const conversation = await ConversationModel.findById(conversationId);
            if (conversation) {
                conversation.participants.forEach((p) => {
                    const pId = p.toString();
                    if (pId !== userId) {
                        io.to(pId).emit("messageStatusUpdated", {
                            conversationId,
                            lastDeliveredMessageId,
                            status: "delivered",
                            userId,
                        });
                    }
                });
            }
            trackMessageDelivery();
        }

        console.log(
            `[delivered] Messages delivered to ${userId} up to ${lastDeliveredMessageId} (${result.modifiedCount} updated)`
        );
    } catch (error) {
        console.error("Error updating messagesDelivered:", error.message);
    }
};

const handleMessagesSeen = async (io, socket, userId, data) => {
    const { conversationId, lastReadMessageId } = data;

    if (!conversationId || !lastReadMessageId) return;

    try {
        const filter = {
            conversationId,
            sender: { $ne: userId },
            readBy: { $ne: userId },
            _id: { $lte: lastReadMessageId },
        };

        const result = await MessageModel.updateMany(filter, {
            $addToSet: { readBy: userId, deliveredTo: userId },
        });

        if (result.modifiedCount > 0) {
            const conversation = await ConversationModel.findById(conversationId);
            if (conversation) {
                conversation.participants.forEach((p) => {
                    const pId = p.toString();
                    if (pId !== userId) {
                        io.to(pId).emit("conversationSeen", {
                            conversationId,
                            lastReadMessageId,
                            userId,
                        });
                    }
                });
            }
            trackMessageSeen();
        }

        console.log(
            `[seen] Conversation ${conversationId} seen by ${userId} up to ${lastReadMessageId} (${result.modifiedCount} updated)`
        );
    } catch (error) {
        console.error("Error updating messagesSeen:", error.message);
    }
};
