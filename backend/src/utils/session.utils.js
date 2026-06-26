import { SessionModel } from "../models/session.model.js"
import { UAParser } from "ua-parser-js"

/**
 * Session Utility
 * 
 * Creates a new session document in MongoDB for multi-device authentication.
 * Extracts device metadata from the request and stores it alongside the
 * refresh token for session management purposes.
 * 
 * Auth flow:
 *   1. User authenticates successfully
 *   2. Call user.generateAccessToken()
 *   3. Call user.generateRefreshAccessToken()
 *   4. Call createSession() to persist the refresh token with device info
 *   5. Return both tokens to the client
 */

/**
 * Determine device type from the parsed UA result.
 * @param {object} ua - Parsed UA result from ua-parser-js
 * @returns {"desktop"|"mobile"|"tablet"|"unknown"}
 */
const getDeviceType = (ua) => {
    const deviceType = ua.device?.type
    if (deviceType === "mobile") return "mobile"
    if (deviceType === "tablet") return "tablet"
    // ua-parser-js doesn't set device.type for desktops — if OS exists, assume desktop
    if (ua.os?.name) return "desktop"
    return "unknown"
}

/**
 * Build a human-readable device name from the parsed UA.
 * Example: "Chrome on Windows 10"
 */
const getDeviceName = (ua) => {
    const browser = ua.browser?.name || "Unknown Browser"
    const os = ua.os?.name || "Unknown OS"
    const osVersion = ua.os?.version ? ` ${ua.os.version}` : ""
    return `${browser} on ${os}${osVersion}`
}

/**
 * Create a new session for a user after successful authentication.
 * 
 * @param {object}  user - Mongoose user document (must have generateAccessToken & generateRefreshAccessToken)
 * @param {object}  req  - Express request object (used to extract device metadata)
 * @returns {{ accessToken: string, refreshToken: string }} - Token pair for cookies
 */
const createSession = async (user, req) => {
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshAccessToken()

    // Parse device metadata from the User-Agent header
    const userAgentString = req.headers["user-agent"] || ""
    const ua = UAParser(userAgentString)

    // Calculate expiry from env (default: 7 days)
    const expiryMs = parseDuration(process.env.REFRESH_TOKEN_EXPIRY || "7d")
    const expiresAt = new Date(Date.now() + expiryMs)

    await SessionModel.create({
        userId: user._id,
        refreshToken,
        deviceName: getDeviceName(ua),
        deviceType: getDeviceType(ua),
        ipAddress: req.ip || req.connection?.remoteAddress || "",
        userAgent: userAgentString,
        expiresAt,
    })

    return { accessToken, refreshToken }
}

/**
 * Parse a duration string like "7d", "15m", "1h" into milliseconds.
 * Supports: s (seconds), m (minutes), h (hours), d (days)
 */
const parseDuration = (str) => {
    const match = str.match(/^(\d+)([smhd])$/)
    if (!match) return 7 * 24 * 60 * 60 * 1000 // fallback: 7 days

    const value = parseInt(match[1])
    const unit = match[2]

    switch (unit) {
        case "s": return value * 1000
        case "m": return value * 60 * 1000
        case "h": return value * 60 * 60 * 1000
        case "d": return value * 24 * 60 * 60 * 1000
        default: return 7 * 24 * 60 * 60 * 1000
    }
}

export { createSession }
