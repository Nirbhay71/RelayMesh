import mongoose from "mongoose"

/**
 * Messages Collection
 * 
 * Every message is stored permanently. Messages belong to conversations,
 * NOT to individual users — no `receiver` field needed.
 * 
 * Message Status Logic (tick system):
 *   ✓  Single Tick  → Message successfully stored in DB
 *   ✓✓ Double Tick  → Receiver's userId exists in `deliveredTo` array
 *   ✓✓ Blue Tick    → Receiver's userId exists in `readBy` array
 * 
 * Supports:
 *   - Text, image, video, and file messages via `messageType`
 *   - Reply threading via `replyTo` (references another Message)
 *   - Soft delete via `deleted` flag (message stays in DB, hidden in UI)
 *   - Message editing via `edited` flag
 */
const MessageSchema = new mongoose.Schema({
    // The conversation this message belongs to
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        index: true,
    },

    // Who sent this message
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    // Content type determines how the frontend renders this message
    messageType: {
        type: String,
        enum: ["text", "image", "video", "file"],
        default: "text",
        required: true,
    },

    // Text content of the message (also used for captions on media)
    content: {
        type: String,
        default: "",
    },

    // URL to the uploaded file (Cloudinary, S3, etc.) — null for text messages
    fileUrl: {
        type: String,
        default: null,
    },

    // References the original message being replied to — null if not a reply
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
    },

    // Array of user IDs who have received (double tick) this message
    deliveredTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],

    // Array of user IDs who have read (blue tick) this message
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],

    // Whether this message has been edited after sending
    edited: {
        type: Boolean,
        default: false,
    },

    // Soft delete — message stays in DB for audit, hidden in UI
    deleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true })

// Compound index for paginated message queries within a conversation
MessageSchema.index({ conversationId: 1, createdAt: -1 })

export const MessageModel = mongoose.model("Message", MessageSchema)
