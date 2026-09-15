import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { ApiError } from "../utils/ApiError.js"
import { MessageModel } from "../models/message.model.js"
import { ConversationModel } from "../models/conversation.model.js"

// ─────────────────────────────────────────────────
// GET /messages/:conversationId
// Fetch paginated messages for a conversation
// ─────────────────────────────────────────────────
const getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (page - 1) * limit;

    // Verify user is participant
    const conversation = await ConversationModel.findOne({
        _id: conversationId,
        participants: req.user._id
    });

    if (!conversation) {
        throw new ApiError(403, "You are not authorized to view these messages");
    }

    const messages = await MessageModel.find({ conversationId })
        .sort({ createdAt: -1 }) // Newest first for pagination
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .populate("sender", "username avatar");

    // Return messages in chronological order for the frontend
    const chronologicalMessages = messages.reverse();

    return res.status(200).json(
        new ApiResponce(200, chronologicalMessages, "Messages fetched successfully")
    );
})

// ─────────────────────────────────────────────────
// GET /messages/conversation/:contactId
// Find a private conversation ID by participant ID
// ─────────────────────────────────────────────────
const getConversationId = asyncHandler(async (req, res) => {
    const { contactId } = req.params;

    const conversation = await ConversationModel.findOne({
        type: "private",
        participants: { $all: [req.user._id, contactId] }
    });

    return res.status(200).json(
        new ApiResponce(200, { conversationId: conversation?._id || null }, "Conversation check complete")
    );
})

// ─────────────────────────────────────────────────
// GET /messages/conversations/list
// All conversations the user is part of, including ones started by
// someone who hasn't been added as a contact yet. Contacts are one-way
// (see Contact model) — this endpoint is what lets a message from an
// unsaved sender still be discoverable in the UI.
// ─────────────────────────────────────────────────
const getConversations = asyncHandler(async (req, res) => {
    const conversations = await ConversationModel.find({
        type: "private",
        participants: req.user._id,
        lastMessage: { $ne: null },
    })
        .populate("participants", "username email avatar bio")
        .populate("lastMessage")
        .sort({ updatedAt: -1 })
        .lean();

    const results = conversations
        .map((conv) => {
            const other = conv.participants.find(
                (p) => p._id.toString() !== req.user._id.toString()
            );
            if (!other) return null;
            return {
                conversationId: conv._id,
                contact: other,
                lastMessage: conv.lastMessage,
                updatedAt: conv.updatedAt,
            };
        })
        .filter(Boolean);

    return res.status(200).json(
        new ApiResponce(200, results, "Conversations fetched successfully")
    );
})

export { getMessages, getConversationId, getConversations }
