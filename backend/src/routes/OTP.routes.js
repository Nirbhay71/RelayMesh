import express from "express"
import { sendOTP, resetPassword } from "../controllers/OTP.controllers.js"

const OTPRouter = express.Router()

OTPRouter.post("/send", sendOTP)             // POST /otp/send
OTPRouter.post("/reset-password", resetPassword)  // POST /otp/reset-password

export { OTPRouter }
