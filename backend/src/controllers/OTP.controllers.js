import { asyncHandler } from "./../utils/asyncHandler.js"
import { UserModel } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { SendEmail } from "../utils/email.utils.js"
import bcrypt from "bcryptjs"

const generateOTP = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let otp = '';
    for (let i = 0; i < 6; i++) {
        otp += chars[Math.floor(Math.random() * chars.length)];
    }
    return otp;
}

// POST /otp/send
// Sends OTP to the user's email for forgot password
const sendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) throw new ApiError(400, "Email is required");

    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(404, "No account found with this email");

    const otp = generateOTP();
    const message = `Your OTP for password reset is ${otp}. It expires in 2 minutes. Do not share this with anyone.`;

    const mailSend = await SendEmail(email, "Password Reset OTP", message);
    if (!mailSend) throw new ApiError(500, "Failed to send OTP");

    user.otp = otp;
    user.otpExpiry = Date.now() + 2 * 60 * 1000; // 2 minutes
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponce(200, {}, "OTP sent successfully")
    );
})

// POST /otp/reset-password
// Verifies OTP and changes password in one step
const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        throw new ApiError(400, "Email, OTP, and new password are required");
    }

    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(404, "No account found with this email");

    // Check OTP
    if (user.otp !== otp) throw new ApiError(400, "Invalid OTP");
    if (user.otpExpiry < Date.now()) throw new ApiError(400, "OTP has expired");

    // Set new password and clear OTP
    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpiry = undefined;

    // Generate fresh tokens and log the user in
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
        .json(new ApiResponce(200, {}, "Password reset successfully"));
})

export { sendOTP, resetPassword }
