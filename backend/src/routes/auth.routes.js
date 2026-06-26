import passport from "passport"
import express from "express"
import { registerUser, loginUser, refreshAccessToken, logoutUser, logoutAllDevices, getCurrentUser } from "../auth/local.auth.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { createSession } from "../utils/session.utils.js"
import { ApiResponce } from "../utils/ApiResponce.js"

const AuthRouter = express.Router()

// ─────────────────────────────────────────────────
// Google OAuth routes
// ─────────────────────────────────────────────────

// Step 1: Redirect user to Google login page
AuthRouter.get("/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
)

// Step 2: Google redirects back here after login
// Creates a Session document (multi-device support) and sets cookies
AuthRouter.get("/google/callback",
    passport.authenticate("google", { failureRedirect: "/login", session: false }),
    async (req, res) => {
        // Create session with device metadata from the request
        const { accessToken, refreshToken } = await createSession(req.user, req);

        const isProd = process.env.NODE_ENV === "production";
        const cookieOptions = {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "None" : "Lax",
        };

        res
            .cookie("accessToken", accessToken, {
                ...cookieOptions,
                maxAge: 15 * 60 * 1000           // 15 minutes
            })
            .cookie("refreshToken", refreshToken, {
                ...cookieOptions,
                maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
            })
            .redirect(process.env.CORS_ORIGIN || "https://relay-mesh.vercel.app/")
    }
)

// ─────────────────────────────────────────────────
// Local auth routes
// ─────────────────────────────────────────────────
AuthRouter.post("/register", registerUser)                      // POST /auth/register
AuthRouter.post("/login", loginUser)                            // POST /auth/login
AuthRouter.post("/refresh-token", refreshAccessToken)           // POST /auth/refresh-token

// ─────────────────────────────────────────────────
// Protected routes (require valid access token)
// ─────────────────────────────────────────────────
AuthRouter.post("/logout", verifyJWT, logoutUser)               // POST /auth/logout (single device)
AuthRouter.post("/logout-all", verifyJWT, logoutAllDevices)     // POST /auth/logout-all (all devices)
AuthRouter.get("/me", verifyJWT, getCurrentUser)                // GET /auth/me (current user)

export { AuthRouter }
