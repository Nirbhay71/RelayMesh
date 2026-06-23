import { Server } from "socket.io";
import { socketAuth } from "./middlewares/socket.auth.middleware.js";

/**
 * Initializes Socket.io and attaches it to the HTTP server
 * @param {import('http').Server} server 
 */
export const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Use Socket.io authentication middleware
    io.use(socketAuth);

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.user.username} (${socket.id})`);

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });

        // Add more event listeners here
    });

    return io;
};
