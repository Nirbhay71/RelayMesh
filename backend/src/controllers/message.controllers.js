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

export { getMessages, getConversationId }
