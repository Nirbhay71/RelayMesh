import mongoose from "mongoose"

/**
 * Group Members Collection
 * 
 * Dedicated collection for group membership — NOT embedded in Conversation.
 * This separation enables:
 *   - Role management (promote to admin, demote to member)
 *   - Join-date tracking per member
 *   - Clean member removal without modifying the Conversation document
 *   - Future extensibility (muted status, nicknames, permissions, etc.)
 * 
 * `groupId` references a Conversation document with type === "group".
 */
const GroupMemberSchema = new mongoose.Schema({
    // Reference to the group conversation
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },

    // Reference to the group member
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    // Member role — used for permission checks (e.g. only admins can remove members)
    role: {
        type: String,
        enum: ["admin", "member"],
        default: "member",
        required: true,
    },

    // When this user joined the group
    joinedAt: {
        type: Date,
        default: Date.now,
    },
})

// Prevent duplicate membership — a user can only be in a group once
GroupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true })

export const GroupMemberModel = mongoose.model("GroupMember", GroupMemberSchema)
