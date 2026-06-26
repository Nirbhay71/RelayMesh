import Redis from "ioredis"

/**
 * Redis Client
 * 
 * Shared Redis connection used across the application for:
 *   - OTP storage (key: otp:{email}, TTL: 300s)
 *   - Online user tracking (key: online:{userId}, value: Set of socket IDs)
 *   - Typing indicators (key: typing:{conversationId}:{userId}, TTL: 5s)
 *   - Rate limiting (key: login:{email}, TTL: 900s)
 *   - Socket.IO Redis Adapter (pub/sub for horizontal scaling)
 * 
 * Requires REDIS_URL in .env (defaults to redis://localhost:6379)
 */
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379")

redis.on("connect", () => console.log("Redis connected successfully"))
redis.on("error", (err) => console.error("Redis connection error:", err.message))

// ─────────────────────────────────────────────────
// OTP Helpers
// Key format: otp:{email}  |  TTL: 300 seconds
// ─────────────────────────────────────────────────

/**
 * Store a 6-digit OTP in Redis with automatic expiry.
 * @param {string} email - User's email address
 * @param {string} otp   - The generated OTP
 */
const storeOTP = async (email, otp) => {
    await redis.set(`otp:${email}`, otp, "EX", 300)
}

/**
 * Retrieve the stored OTP for a given email.
 * Returns null if expired or not found.
 */
const getOTP = async (email) => {
    return await redis.get(`otp:${email}`)
}

/**
 * Delete OTP after successful verification.
 */
const deleteOTP = async (email) => {
    await redis.del(`otp:${email}`)
}

// ─────────────────────────────────────────────────
// Online Status Helpers
// Key format: online:{userId}  |  Value: Redis Set of socket IDs
// Supports multiple devices — SADD/SREM on the set
// ─────────────────────────────────────────────────

/**
 * Register a socket connection for a user (multi-device support).
 * Uses a Redis Set so the same socket ID is never duplicated.
 */
const setUserOnline = async (userId, socketId) => {
    await redis.sadd(`online:${userId}`, socketId)
}

/**
 * Remove a socket connection when a device disconnects.
 * The user is considered offline when the set becomes empty.
 */
const removeUserOnline = async (userId, socketId) => {
    await redis.srem(`online:${userId}`, socketId)
    // Clean up the key entirely if no sockets remain
    const remaining = await redis.scard(`online:${userId}`)
    if (remaining === 0) {
        await redis.del(`online:${userId}`)
    }
}

/**
 * Check if a user has any active socket connections.
 */
const isUserOnline = async (userId) => {
    const count = await redis.scard(`online:${userId}`)
    return count > 0
}

/**
 * Get all active socket IDs for a user (useful for targeted emit).
 */
const getUserSocketIds = async (userId) => {
    return await redis.smembers(`online:${userId}`)
}

// ─────────────────────────────────────────────────
// Typing Indicator Helpers
// Key format: typing:{conversationId}:{userId}  |  TTL: 5 seconds
// Auto-expires — no manual cleanup needed
// ─────────────────────────────────────────────────

/**
 * Mark a user as currently typing in a conversation.
 * Key auto-expires in 5 seconds.
 */
const setTyping = async (conversationId, userId) => {
    await redis.set(`typing:${conversationId}:${userId}`, "true", "EX", 5)
}

/**
 * Explicitly clear typing indicator (e.g. when message is sent).
 */
const clearTyping = async (conversationId, userId) => {
    await redis.del(`typing:${conversationId}:${userId}`)
}

// ─────────────────────────────────────────────────
// Rate Limiting Helpers (Optional)
// Key format: login:{email}  |  TTL: 900 seconds (15 minutes)
// ─────────────────────────────────────────────────

/**
 * Increment failed login attempt counter.
 * Returns the current count after increment.
 */
const incrementLoginAttempts = async (email) => {
    const key = `login:${email}`
    const count = await redis.incr(key)
    // Set TTL only on first attempt (INCR creates the key with value 1)
    if (count === 1) {
        await redis.expire(key, 900) // 15 minutes
    }
    return count
}

/**
 * Get current failed login attempt count.
 */
const getLoginAttempts = async (email) => {
    const count = await redis.get(`login:${email}`)
    return parseInt(count) || 0
}

/**
 * Reset login attempts after successful login.
 */
const resetLoginAttempts = async (email) => {
    await redis.del(`login:${email}`)
}

export {
    redis,
    storeOTP,
    getOTP,
    deleteOTP,
    setUserOnline,
    removeUserOnline,
    isUserOnline,
    getUserSocketIds,
    setTyping,
    clearTyping,
    incrementLoginAttempts,
    getLoginAttempts,
    resetLoginAttempts,
}
