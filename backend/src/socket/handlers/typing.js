export const registerTypingHandlers = (io, socket, userId) => {
    socket.on("startTyping", (data) => {
        handleStartTyping(io, socket, userId, data);
    });

    socket.on("stopTyping", (data) => {
        handleStopTyping(io, socket, userId, data);
    });
};

const handleStartTyping = (io, socket, userId, data) => {
    const { conversationId, participantIds } = data;

    if (!conversationId || !Array.isArray(participantIds)) return;

    participantIds.forEach((pId) => {
        if (pId !== userId) {
            io.to(pId).emit("userTyping", {
                conversationId,
                username: socket.user.username,
            });
        }
    });

    console.log(`[typing] ${socket.user.username} started typing in ${conversationId}`);
};

const handleStopTyping = (io, socket, userId, data) => {
    const { conversationId, participantIds } = data;

    if (!conversationId || !Array.isArray(participantIds)) return;

    participantIds.forEach((pId) => {
        if (pId !== userId) {
            io.to(pId).emit("userStoppedTyping", {
                conversationId,
                username: socket.user.username,
            });
        }
    });

    console.log(`[typing] ${socket.user.username} stopped typing in ${conversationId}`);
};
