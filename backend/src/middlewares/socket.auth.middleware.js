import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Socket.io middleware to verify JWT from cookies
 */
export const socketAuth = async (socket, next) => {
    try {
        const cookieString = socket.handshake.headers.cookie;
        if (!cookieString) {
            return next(new ApiError(401, "Authentication error: No cookies found"));
        }

        // Simple cookie parser
        const cookies = Object.fromEntries(
            cookieString.split(';').map(c => c.trim().split('='))
        );

        const token = cookies.accessToken;

        if (!token) {
            return next(new ApiError(401, "Authentication error: No token provided"));
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await UserModel.findById(decodedToken?.id).select("-password -refreshToken");

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
