import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import { app } from "./app.js"

dotenv.config()


const port = process.env.PORT || 5000;


// Environment are not loading ..........
let DB_URL = process.env.MONGODB_URI || "mongodb://localhost:27017/test-1";
if (DB_URL && DB_URL.endsWith("/")) {
    DB_URL = DB_URL.slice(0, -1);
}


connectDB(DB_URL)
    .then(() => {
        app.on("error", (err) => {
            console.log("Error before listing to the port");
            throw err
        })

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        })
    })
    .catch((err) => {
        console.log("Database connection failed error : ", err);
    })