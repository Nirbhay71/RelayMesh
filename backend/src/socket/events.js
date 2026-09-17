import {
    handleConnection,
    handleDisconnect,
    registerMessageHandlers,
    registerTypingHandlers,
    registerReceiptHandlers,
} from "./handlers/index.js";

export const registerSocketEvents = (io) => {
    io.on("connection", async (socket) => {
        const userId = socket.user._id.toString();

        await handleConnection(io, socket);

        registerMessageHandlers(io, socket, userId);
        registerTypingHandlers(io, socket, userId);
        registerReceiptHandlers(io, socket, userId);

        socket.on("disconnect", async () => {
            await handleDisconnect(io, socket, userId);
        });
    });
};
