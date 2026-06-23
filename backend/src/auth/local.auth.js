import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { ApiError } from "../utils/ApiError.js"
import { createUser } from "../utils/user.utils.js"
import { UserModel } from "../models/user.models.js"
import jwt from "jsonwebtoken"

// POST /auth/register
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    const user = await createUser({ username, email, password, authType: "local" });

    return res.status(201).json(
        new ApiResponce(201, user, "User registered successfully")
    );
})

// POST /auth/login
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    // Find user by email
    const user = await UserModel.findOne({ email });

    if (!user) {
        throw new ApiError(404, "No account found with this email");
    }

    // Block Google users from logging in with password
    if (user.authType !== "local") {
        throw new ApiError(403, `This account uses ${user.authType} login. Please use that instead.`);
    }

    // Check password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect password");
    }

    // Generate tokens and set cookies
    const { accessToken, refreshToken } = await user.generateToken();

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
    };

    return res
        .cookie("accessToken", accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000           // 15 minutes
        })
        .cookie("refreshToken", refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
        })
        .status(200)
        .json(new ApiResponce(200, { user }, "Logged in successfully"));
})

// POST /auth/refresh-token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken;

    if (!incomingRefreshToken) throw new ApiError(401, "No refresh token provided");

    // Verify the refresh token signature
    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find user and check token matches DB (blocks reuse of stolen tokens)
    const user = await UserModel.findById(decoded.id);
    if (!user || user.refreshToken !== incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is invalid or has expired");
    }

    // Rotate both tokens
    const { accessToken, refreshToken } = await user.generateToken();

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
    };

    return res
        .cookie("accessToken", accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000
        })
        .cookie("refreshToken", refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        .status(200)
        .json(new ApiResponce(200, {}, "Access token refreshed"));
})

const changePassword = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(404, "No account found with this email");

    // Hash and save new password
    user.password = await bcrypt.hash(password, 10);

    
    // Generate tokens (also saves refreshToken to DB internally)
    const { accessToken, refreshToken } = await user.generateToken();

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
    };

    return res
        .cookie("accessToken", accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000
        })
        .cookie("refreshToken", refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        .status(200)
        .json(new ApiResponce(200, {}, "Password changed successfully"));
})

export { registerUser, loginUser, refreshAccessToken, changePassword }
