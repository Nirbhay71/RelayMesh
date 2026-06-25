import mongoose from "mongoose"

/**
 * Conversation Collection
 * 
 * Unified collection for both private (1-to-1) and group chats.
 * 
 * Private conversations:
 *   - Exactly two participants
 *   - Only one conversation should exist between the same two users
 *   - groupName, groupAvatar, groupAdmin are not applicable
 * 
 * Group conversations:
 *   - Multiple participants
 *   - Group metadata (name, avatar, admin) is stored here
 *   - Detailed member info (roles, join dates) lives in GroupMember collection
 * 
 * `lastMessage` references the most recent Message for quick
 * conversation-list rendering without querying the Messages collection.
 */
const ConversationSchema = new mongoose.Schema({
    // Conversation type determines which fields are relevant
    type: {
        type: String,
        enum: ["private", "group"],
        required: true,
        index: true,
    },

    // Array of user ObjectIds participating in this conversation
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],

    // ----- Group-only fields -----

    // Display name for the group chat
    groupName: {
        type: String,
        trim: true,
    },

    // Group avatar URL (e.g. from Cloudinary)
    groupAvatar: {
        type: String,
        default: "",
    },

    // The primary admin of the group
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    // ----- Common fields -----

    // User who created this conversation (initiator of DM or group creator)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    // Reference to the latest message for conversation-list preview
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
    },
}, { timestamps: true })

// Index on participants for finding conversations a user belongs to
ConversationSchema.index({ participants: 1 })

export const ConversationModel = mongoose.model("Conversation", ConversationSchema)
