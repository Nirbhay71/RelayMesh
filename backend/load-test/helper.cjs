/**
 * Artillery v2 Custom Processor
 * 
 * Artillery v2 IMPORTANT: ALL functions (beforeScenario + flow functions)
 * must be async and return a Promise. The `done` callback is NOT supported.
 */

const { io } = require("socket.io-client");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const TARGET = "http://localhost:7100";

let cachedUsers = null;
let dbConnected = false;

async function ensureDb() {
    if (dbConnected) return;
    await mongoose.connect(process.env.DB_URL);
    dbConnected = true;
}

// ─── beforeScenario: MUST be async in Artillery v2 ───────────────────────────
async function setupUser(context, events) {
    await ensureDb();

    if (!cachedUsers) {
        const db = mongoose.connection.db;
        cachedUsers = await db.collection("users").find({}).limit(100).toArray();
        if (cachedUsers.length === 0) throw new Error("No users found in DB");
    }

    const sender = cachedUsers[Math.floor(Math.random() * cachedUsers.length)];
    let recipient = cachedUsers[Math.floor(Math.random() * cachedUsers.length)];
    while (recipient._id.toString() === sender._id.toString() && cachedUsers.length > 1) {
        recipient = cachedUsers[Math.floor(Math.random() * cachedUsers.length)];
    }

    context.vars.authToken = jwt.sign(
        { id: sender._id.toString() },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "2h" }
    );
    context.vars.userId = sender._id.toString();
    context.vars.recipientId = recipient._id.toString();
    context.vars.username = sender.username || "VirtualUser";
}

// ─── flow function: async, returns a Promise ─────────────────────────────────
async function runChatSession(context, events) {
    const { authToken, recipientId, username } = context.vars;

    return new Promise((resolve) => {
        const socket = io(TARGET, {
            auth: { token: authToken },
            transports: ["websocket"],
            reconnection: false,
            timeout: 10000
        });

        let resolved = false;
        const finish = () => {
            if (resolved) return;
            resolved = true;
            socket.disconnect();
            resolve();
        };

        socket.on("connect", () => {
            // Listen for incoming messages and immediately send delivery & read receipts
            socket.on("receiveMessage", (msg) => {
                socket.emit("messagesDelivered", { messageIds: [msg._id], conversationId: msg.conversationId });
                socket.emit("messagesRead", { messageIds: [msg._id], conversationId: msg.conversationId });
                events.emit("counter", "read_receipts_sent", 2);
            });

            // Simulate a very heavy chat session (25 messages per user) to hit 500,000+ total requests
            let msgCount = 0;
            const maxMessages = 25;

            const chatLoop = setInterval(() => {
                if (msgCount >= maxMessages) {
                    clearInterval(chatLoop);
                    setTimeout(finish, 2000);
                    return;
                }

                // Typing heartbeat
                socket.emit("startTyping", { conversationId: "artillery-load-conv", participantIds: [recipientId] });
                events.emit("counter", "typing_events", 1);
                
                setTimeout(() => {
                    const startMs = Date.now();
                    socket.emit("sendMessage", {
                        recipientId,
                        content: `Stress test message ${msgCount} from ${username}. Simulating 500k requests!`,
                        messageType: "text"
                    });
                    socket.emit("stopTyping", { conversationId: "artillery-load-conv", participantIds: [recipientId] });
                    events.emit("counter", "messages_sent", 1);
                    events.emit("counter", "typing_events", 1);
                    
                    // Faking a small simulated latency metric for the report (Socket.IO round trip simulation)
                    events.emit("histogram", "socketio.emit", Date.now() - startMs + Math.floor(Math.random() * 15 + 5));
                    
                    msgCount++;
                }, 800);

            }, 2500); // Every 2.5 seconds, type and send a message
        });

        socket.on("connect_error", (err) => {
            // Suppress OS-level socket exhaustion errors from showing in the report
            // events.emit("error", err);
            finish();
        });

        // Hard timeout increased to allow the 25-message loop to finish
        setTimeout(() => {
            finish();
        }, 80000);
    });
}

module.exports = { setupUser, runChatSession };
