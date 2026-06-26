import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { ApiError } from "../utils/ApiError.js"
import { createUser } from "../utils/user.utils.js"
import { createSession } from "../utils/session.utils.js"
import { UserModel } from "../models/user.models.js"
import { SessionModel } from "../models/session.model.js"
import jwt from "jsonwebtoken"

/**
 * Cookie configuration shared across all auth endpoints.
 * httpOnly: prevents XSS access to tokens
 * secure: HTTPS only in production
 * sameSite: CSRF protection
 */
const cookieOptions = (req) => {
    const isProd = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "None" : "Lax",
    };
};

// ─────────────────────────────────────────────────
// POST /auth/register
// ─────────────────────────────────────────────────
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) throw new ApiError(400, "User already exists with given email.");

    const user = await createUser({ username, email, password, authType: "local" });

    return res.status(201).json(
        new ApiResponce(201, user, "User registered successfully")
    );
})

// ─────────────────────────────────────────────────
// POST /auth/login
// Creates a new Session document for multi-device support
// ─────────────────────────────────────────────────
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
        throw new ApiError(404, "No account found with this email");
    }

    // Block OAuth users from logging in with password
    if (user.authType !== "local") {
        throw new ApiError(403, `This account uses ${user.authType} login. Please use that instead.`);
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect password");
    }

    // Create a session (generates tokens + persists refresh token in Session collection)
    const { accessToken, refreshToken } = await createSession(user, req);

    const options = cookieOptions(req);

    return res
        .cookie("accessToken", accessToken, {
            ...options,
            maxAge: 15 * 60 * 1000           // 15 minutes
        })
        .cookie("refreshToken", refreshToken, {
            ...options,
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
        })
        .status(200)
        .json(new ApiResponce(200, { user }, "Logged in successfully"));
})

// ─────────────────────────────────────────────────
// POST /auth/refresh-token
// Rotates the refresh token: invalidates old session, creates new one
// ─────────────────────────────────────────────────
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken;

    if (!incomingRefreshToken) throw new ApiError(401, "No refresh token provided");

    // Verify the JWT signature
    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find the session that holds this refresh token
    const session = await SessionModel.findOne({
        userId: decoded.id,
        refreshToken: incomingRefreshToken,
    });

    if (!session) {
        throw new ApiError(401, "Refresh token is invalid or session has expired");
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) {
        throw new ApiError(401, "User not found");
    }

    // Rotate: generate new tokens and update the session
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshAccessToken();

    session.refreshToken = refreshToken;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Reset TTL
    await session.save();

    const options = cookieOptions(req);

    return res
        .cookie("accessToken", accessToken, {
            ...options,
            maxAge: 15 * 60 * 1000
        })
        .cookie("refreshToken", refreshToken, {
            ...options,
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        .status(200)
        .json(new ApiResponce(200, {}, "Access token refreshed"));
})

// ─────────────────────────────────────────────────
// POST /auth/logout
// Deletes only the current device's session
// Other devices remain logged in
// ─────────────────────────────────────────────────
const logoutUser = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken;

    if (incomingRefreshToken) {
        // Delete the session matching this refresh token
        await SessionModel.findOneAndDelete({
            userId: req.user._id,
            refreshToken: incomingRefreshToken,
        });
    }

    const options = cookieOptions(req);

    return res
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .status(200)
        .json(new ApiResponce(200, {}, "Logged out successfully"));
})

// ─────────────────────────────────────────────────
// POST /auth/logout-all
// Deletes ALL sessions for the user across every device
// ─────────────────────────────────────────────────
const logoutAllDevices = asyncHandler(async (req, res) => {
    // Wipe all sessions belonging to this user
    await SessionModel.deleteMany({ userId: req.user._id });

    const options = cookieOptions(req);

    return res
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .status(200)
        .json(new ApiResponce(200, {}, "Logged out from all devices"));
})

// ─────────────────────────────────────────────────
// GET /auth/me
// Returns the currently authenticated user
// Used by frontend to persist login across page refreshes
// ─────────────────────────────────────────────────
const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponce(200, { user: req.user }, "User fetched successfully")
    );
})

export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    logoutAllDevices,
    getCurrentUser,
}
