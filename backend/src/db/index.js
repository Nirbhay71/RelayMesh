import mongoose from "mongoose"

const connectDB = async (DB_URL) => {
    try {
        const connectionInstance = await mongoose.connect(DB_URL);
        console.log("Database connected successfully ...");
        console.log("Host : ", connectionInstance.connection.host);
    } catch (err) {
        console.log("Database connection error in ./src/db/index.js");
        console.log("Error is : ", err);
        process.exit(1);
    }
}

export { connectDB }