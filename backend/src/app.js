import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./auth/google.auth.js";
import { AuthRouter } from "./routes/auth.routes.js";
import { OTPRouter } from "./routes/OTP.routes.js";

const app = express();

// Middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Passport (OAuth handshake only — no session)
app.use(passport.initialize());

// Routes
// GET /auth/google          → redirect to Google
// GET /auth/google/callback → generate JWT cookies + redirect to dashboard
app.use("/auth", AuthRouter);
app.use("/otp", OTPRouter);

export { app }