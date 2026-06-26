/**
 * One-time token generator for Artillery load test.
 * 
 * Run: node load-test/generate-tokens.cjs
 * 
 * Connects to MongoDB, grabs real users, mints JWTs,
 * saves to load-test/tokens.csv for Artillery payload.
 */

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function run() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.DB_URL);

    const db = mongoose.connection.db;
    const users = await db.collection("users").find({}).limit(100).toArray();

    if (users.length === 0) {
        console.error("No users found. Create some accounts first.");
        process.exit(1);
    }

    console.log(`Found ${users.length} users. Generating tokens...`);

    const rows = [];

    users.forEach((user, i) => {
        // Pair each user with another user as recipient
        const recipient = users[(i + 1) % users.length];
        
        const token = jwt.sign(
            { id: user._id.toString() },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "8h" }
        );

        rows.push([token, user._id.toString(), recipient._id.toString(), user.username || "user"]);
    });

    const csvPath = path.join(__dirname, "tokens.csv");
    // CSV format: authToken,userId,recipientId,username
    const csv = rows.map(r => r.join(",")).join("\n");
    fs.writeFileSync(csvPath, csv);

    console.log(`\n✅ Generated ${rows.length} tokens → load-test/tokens.csv`);
    console.log("   Now run: npm run load-test:report\n");

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => {
    console.error("Error:", err.message);
    process.exit(1);
});
