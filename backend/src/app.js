import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./auth/google.auth.js";
import { AuthRouter } from "./routes/auth.routes.js";
import { OTPRouter } from "./routes/OTP.routes.js";
import { ContactRouter } from "./routes/contact.routes.js";
import { MessageRouter } from "./routes/message.routes.js";

const app = express();

// Build the allowed origins list.
// CORS_ORIGIN in .env can be a single URL or comma-separated list of URLs.
// A wildcard "*" cannot be used with credentials:true, so we fall back to dev defaults.
const rawOrigins = process.env.CORS_ORIGIN || "";
const devDefaults = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://192.168.1.7:5173",
    "http://192.168.1.7:5174",
];
const allowedOrigins =
    !rawOrigins || rawOrigins === "*"
        ? devDefaults
        : rawOrigins.split(",").map((o) => o.trim()).filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
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
app.use("/contacts", ContactRouter);
app.use("/messages", MessageRouter);

export { app }