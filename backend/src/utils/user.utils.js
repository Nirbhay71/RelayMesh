import { ApiError } from "../utils/ApiError.js";
import { UserModel } from "../models/user.models.js";
import { sendWelcomeEmail } from "../utils/email.utils.js";

const createUser = async (userData) => {
    if (!userData) throw new ApiError(400, "Please provide all required fields");

    // Always check for existing user regardless of authType
    const existingUser = await UserModel.findOne({ email: userData.email });

    if (existingUser) {
        if (userData.authType === "local") {
            // Local: two accounts with same email is an error
            throw new ApiError(409, "Email already registered");
        }
        // Google (and other OAuth): re-login → just return the existing user
        return existingUser;
    }

    // Don't hash here! The User model has a pre-save hook that handles hashing.
    const password = userData.password;

    const user = await UserModel.create({
        username: userData.username,
        email: userData.email,
        password: password,
        authType: userData.authType
    })

    if (!user) throw new ApiError(500, "Unable to create user");

    // Send welcome email — don't block registration if email fails
    sendWelcomeEmail(user.email, user.username).catch(() => { });

    return user;

}

export { createUser };