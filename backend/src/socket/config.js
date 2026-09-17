import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "../utils/redis.utils.js";
import { socketAuth } from "../middlewares/socket.auth.middleware.js";

export const createSocketServer = (server) => {
    const pubClient = redis;
    const subClient = redis.duplicate();

    subClient.on("error", (err) => {
        console.error("Redis subClient error:", err.message);
    });

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

    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true,
        },
        adapter: createAdapter(pubClient, subClient),
    });

    io.use(socketAuth);

    return io;
};
