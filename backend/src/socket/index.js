import { createSocketServer } from "./config.js";
import { registerSocketEvents } from "./events.js";

export const initializeSocket = (server) => {
    const io = createSocketServer(server);
    registerSocketEvents(io);
    return io;
};
