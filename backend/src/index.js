import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import { app } from "./app.js";
import { createServer } from "http";
import { initializeSocket } from "./socket.js";

dotenv.config();

const port = process.env.PORT || 5000;

// Initialize HTTP server and Socket.io
const server = createServer(app);
const io = initializeSocket(server);

// Environment are not loading ..........
let DB_URL = process.env.MONGODB_URI || "mongodb://localhost:27017/RelayMesh";
if (DB_URL && DB_URL.endsWith("/")) {
    DB_URL = DB_URL.slice(0, -1);
}

connectDB(DB_URL)
    .then(() => {
        server.on("error", (err) => {
            console.log("Error before listening to the port");
            throw err;
        });

        server.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((err) => {
        console.log("Database connection failed error : ", err);
    });

export { io };