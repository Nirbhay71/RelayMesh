import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    authType: {
        type: String,
        enum: ["google", "local", "github"],
        required: true,
    },
    otp: {
        type: String,
    },
    otpExpiry: {
        type: Date,
    },
    refreshToken: {
        type: String
    }
}, { timestamps: true })

UserSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
})

UserSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

UserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            id: this._id,
            email: this.email,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

UserSchema.methods.generateRefreshAccessToken = function () {
    return jwt.sign(
        {
            id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

UserSchema.methods.generateToken = async function () {

    const accessToken = this.generateAccessToken();
    const refreshToken = this.generateRefreshAccessToken();

    this.refreshToken = refreshToken;
    await this.save({ validateBeforeSave: false });

    return {
        accessToken,
        refreshToken
    };
}

export const UserModel = mongoose.model("User", UserSchema)