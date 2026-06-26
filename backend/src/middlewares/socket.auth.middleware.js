import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Socket.io middleware to verify JWT.
 * 
 * Priority:
 *   1. socket.handshake.auth.token  → used by Artillery, Postman, mobile clients
 *   2. Cookie: accessToken          → used by the React browser frontend
 */
export const socketAuth = async (socket, next) => {
    try {
        let token = null;

        // [1] Check handshake.auth first (programmatic clients / load testers)
        if (socket.handshake.auth?.token) {
            token = socket.handshake.auth.token;
        }

        // [2] Fall back to cookie (browser frontend)
        if (!token) {
            const cookieString = socket.handshake.headers.cookie;
            if (cookieString) {
                const cookies = Object.fromEntries(
                    cookieString.split(';').map(c => c.trim().split('='))
                );
                token = cookies.accessToken;
            }
        }

        if (!token) {
            return next(new ApiError(401, "Authentication error: No token provided"));
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await UserModel.findById(decodedToken?.id).select("-password");

        if (!user) {
            return next(new ApiError(401, "Authentication error: User not found"));
        }

        // Attach user to the socket for further use
        socket.user = user;
        next();
    } catch (err) {
        return next(new ApiError(401, `Authentication error: ${err.message}`));
    }
};
