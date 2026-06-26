import { asyncHandler } from "./../utils/asyncHandler.js"
import { UserModel } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { SendEmail } from "../utils/email.utils.js"
import { storeOTP, getOTP, deleteOTP } from "../utils/redis.utils.js"
import { createSession } from "../utils/session.utils.js"

/**
 * Generate a 6-digit numeric OTP.
 * Numeric-only as per the spec (e.g. 483921).
 */
const generateOTP = () => {
    let otp = ""
    for (let i = 0; i < 6; i++) {
        otp += Math.floor(Math.random() * 10)
    }
    return otp
}

// ─────────────────────────────────────────────────
// POST /otp/send
// Generates OTP, stores in Redis (300s TTL), emails to user
// OTP is NEVER stored in MongoDB
// ─────────────────────────────────────────────────
const sendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) throw new ApiError(400, "Email is required");

    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(404, "No account found with this email");

    // Block non-local users (e.g. Google OAuth) from resetting password
    if (user.authType !== "local") {
        throw new ApiError(403, `This account uses ${user.authType} login. Please sign in with ${user.authType} instead.`);
    }

    const otp = generateOTP();
    const message = `Your OTP for password reset is ${otp}. It expires in 5 minutes. Do not share this with anyone.`;

    const mailSend = await SendEmail(email, "Password Reset OTP", message);
    if (!mailSend) throw new ApiError(500, "Failed to send OTP");

    // Store OTP in Redis with 300 second (5 minute) TTL — auto-expires
    await storeOTP(email, otp);

    return res.status(200).json(
        new ApiResponce(200, {}, "OTP sent successfully")
    );
})

// ─────────────────────────────────────────────────
// POST /otp/reset-password
// Verifies OTP from Redis and resets password in one step
// Creates a new Session for auto-login after reset
// ─────────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        throw new ApiError(400, "Email, OTP, and new password are required");
    }

    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(404, "No account found with this email");

    // Retrieve OTP from Redis (returns null if expired or not found)
    const storedOTP = await getOTP(email);

    if (!storedOTP) throw new ApiError(400, "OTP has expired or was not requested");
    if (storedOTP !== otp) throw new ApiError(400, "Invalid OTP");

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    // Clear the OTP from Redis after successful verification
    await deleteOTP(email);

    // Auto-login: create a session and return tokens
    const { accessToken, refreshToken } = await createSession(user, req);

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
        .json(new ApiResponce(200, {}, "Password reset successfully"));
})

export { sendOTP, resetPassword }
