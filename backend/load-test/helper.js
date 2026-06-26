import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

let cachedUsers = null;

/**
 * Called by Artillery before each virtual user scenario.
 * Grabs a random user from the DB and mints a fresh JWT for them.
 * Artillery stores the result in context.vars so the scenario can use it.
 */
export async function generateAuthToken(context, events, done) {
    try {
        if (!mongoose.connection.readyState) {
            await mongoose.connect(process.env.DB_URL);
        }

        if (!cachedUsers) {
            const db = mongoose.connection.db;
            // Grab up to 50 real users to distribute load across multiple accounts
            cachedUsers = await db.collection("users").find({}).limit(50).toArray();
            if (cachedUsers.length === 0) {
                throw new Error("No users found in DB. Please create accounts first.");
            }
            console.log(`[Artillery Setup] Loaded ${cachedUsers.length} users for load test.`);
        }

        // Pick a random user so messages go between real accounts
        const user = cachedUsers[Math.floor(Math.random() * cachedUsers.length)];
        const token = jwt.sign(
            { id: user._id.toString() },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "2h" }
        );

        // Pick a different random user as the recipient
        let recipient = cachedUsers[Math.floor(Math.random() * cachedUsers.length)];
        while (recipient._id.toString() === user._id.toString() && cachedUsers.length > 1) {
            recipient = cachedUsers[Math.floor(Math.random() * cachedUsers.length)];
        }

        context.vars.authToken = token;
        context.vars.userId = user._id.toString();
        context.vars.recipientId = recipient._id.toString();
        context.vars.username = user.username;

        return done();
    } catch (err) {
        console.error("[Artillery Setup Error]", err.message);
        return done(err);
    }
}
