import passport from "passport"
import express from "express"
import { registerUser, loginUser, refreshAccessToken, changePassword } from "../auth/local.auth.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const AuthRouter = express.Router()

// Google OAuth routes
// Step 1: Redirect user to Google login page
AuthRouter.get("/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
)

// Step 2: Google redirects back here after login
AuthRouter.get("/google/callback",
    passport.authenticate("google", { failureRedirect: "/login", session: false }),
    async (req, res) => {
        const { accessToken, refreshToken } = await req.user.generateToken();

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Lax",
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
            .redirect("http://localhost:3000/dashboard")
    }
)


// Local auth routes
AuthRouter.post("/register", registerUser)                      // POST /auth/register
AuthRouter.post("/login", loginUser)                            // POST /auth/login
AuthRouter.post("/refresh-token", refreshAccessToken)           // POST /auth/refresh-token
AuthRouter.post("/change-password", verifyJWT, changePassword)  // POST /auth/change-password (protected)

export { AuthRouter }
