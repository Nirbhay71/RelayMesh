import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

/**
 * User Collection
 * 
 * Core user document. Stores only persistent identity data.
 * 
 * What is NOT stored here (by design):
 *   - refreshToken → lives in Session collection (multi-device support)
 *   - OTP          → lives in Redis (transient, auto-expires)
 *   - socketId     → lives in Redis (ephemeral connection state)
 *   - onlineStatus → derived from Redis (online:{userId} set)
 */
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,        // Each username must be globally unique
        lowercase: true,
        trim: true,
        index: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },

    // Password is required only for local auth — Google users don't have one
    password: {
        type: String,
        required: function () {
            return this.authType === "local"
        },
    },

    // Authentication strategy used to create this account
    authType: {
        type: String,
        enum: ["local", "google"],
        required: true,
    },

    // Profile avatar URL (e.g. from Cloudinary)
    avatar: {
        type: String,
        default: "",
    },

    // Short bio / status message
    bio: {
        type: String,
        default: "",
    },

    // Last time the user was seen online (updated on socket disconnect)
    lastSeen: {
        type: Date,
    },
}, { timestamps: true })

// ─────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────

/**
 * Pre-save hook: hash password using bcrypt before persisting.
 * Only runs when the password field has been modified (avoids
 * re-hashing on unrelated updates like bio changes).
 */
UserSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
})

// ─────────────────────────────────────────────────
// Instance Methods
// ─────────────────────────────────────────────────

/**
 * Compare a plaintext password against the stored hash.
 */
UserSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

/**
 * Generate a short-lived access token (JWT).
 * Contains user identity claims for request authentication.
 */
UserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            id: this._id,
            email: this.email,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

/**
 * Generate a long-lived refresh token (JWT).
 * Contains only the user ID — minimal claims for security.
 * 
 * Note: This method only generates the token. Persistence is handled
 * by the Session collection via session.utils.js — enabling multi-device
 * login where each device has its own independent refresh token.
 */
UserSchema.methods.generateRefreshAccessToken = function () {
    return jwt.sign(
        {
            id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const UserModel = mongoose.model("User", UserSchema)