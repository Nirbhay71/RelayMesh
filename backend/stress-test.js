import { io } from "socket.io-client";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const NUM_CLIENTS = 200; // Start with 200 for a local CPU test
const CLIENTS = [];
let messagesReceived = 0;
let connections = 0;

async function runTest() {
    console.log("Connecting to Database to get a test user...");
    await mongoose.connect(process.env.DB_URL);
    
    // We just need any valid user ID from the database to generate a token
    const db = mongoose.connection.db;
    const user = await db.collection("users").findOne({});
    
    if (!user) {
        console.error("No users found in the database. Please create an account first.");
        process.exit(1);
    }

    const userId = user._id.toString();
    const token = jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    
    console.log(`Found user: ${user.username}. Starting ${NUM_CLIENTS} socket connections...`);

    for (let i = 0; i < NUM_CLIENTS; i++) {
        const socket = io("http://localhost:7100", {
            extraHeaders: {
                Cookie: `accessToken=${token}`
            },
            transports: ["websocket"] // Force WebSocket, skip HTTP long-polling
        });

        socket.on("connect", () => {
            connections++;
            if (connections === NUM_CLIENTS) {
                console.log(`✅ All ${NUM_CLIENTS} virtual users connected successfully!`);
                startSpamming(userId);
            }
        });

        socket.on("disconnect", () => {
            connections--;
        });

        socket.on("newMessage", () => {
            messagesReceived++;
        });

        CLIENTS.push(socket);
    }
}

function startSpamming(userId) {
    console.log("🚀 Starting Load Test (Emitting typing & messages)...");
    
    setInterval(() => {
        // Every 50ms, pick a random socket to send a message
        const randomSocket = CLIENTS[Math.floor(Math.random() * CLIENTS.length)];
        
        // Simulating the heartbeat typing
        randomSocket.emit("startTyping", {
            conversationId: "test_conv_id",
            participantIds: [userId] // Send to self to trigger the event loop
        });

        randomSocket.emit("sendMessage", {
            recipientId: userId, // Send to self so we can count the received message!
            content: "Load test message from virtual user!",
            messageType: "text"
        });
        
    }, 50); // 20 messages per second

    // Print stats every 5 seconds
    setInterval(() => {
        console.log(`Stats: ${connections} connected | ${messagesReceived} messages received | Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
    }, 5000);
}

runTest().catch(console.error);
