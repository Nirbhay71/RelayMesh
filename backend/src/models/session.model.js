import mongoose from "mongoose"

/**
 * Session Collection
 * 
 * Supports multi-device login — each device gets its own session
 * with an independent refresh token. Logging out from one device
 * only removes that session; other devices remain unaffected.
 * 
 * TTL index on `expiresAt` ensures MongoDB automatically purges
 * expired sessions without any cron or manual cleanup.
 */
const SessionSchema = new mongoose.Schema({
    // Reference to the authenticated user
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    // JWT refresh token unique to this device session
    refreshToken: {
        type: String,
        required: true,
    },

    // Human-readable device identifier, e.g. "Chrome on Windows"
    deviceName: {
        type: String,
        default: "Unknown Device",
    },

    // Device category for analytics and session management UI
    deviceType: {
        type: String,
        enum: ["desktop", "mobile", "tablet", "unknown"],
        default: "unknown",
    },

    // Client IP at the time of login
    ipAddress: {
        type: String,
    },

    // Raw User-Agent header for detailed device fingerprinting
    userAgent: {
        type: String,
    },

    // MongoDB TTL index field — session auto-deletes after this time
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }, // TTL index: remove doc when Date.now() >= expiresAt
    },
}, { timestamps: true })

// Compound index for fast refresh-token lookups scoped to a user
SessionSchema.index({ userId: 1, refreshToken: 1 })

export const SessionModel = mongoose.model("Session", SessionSchema)
