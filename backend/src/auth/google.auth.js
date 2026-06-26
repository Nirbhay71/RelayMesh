import passport from "passport";
import GoogleStrategy from "passport-google-oauth20";
import { createUser } from "../utils/user.utils.js";

passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URI
    },
    async function (accessToken, refreshToken, profile, done) {
        try {
            const userData = {
                username: profile.displayName.toLowerCase().replace(/\s/g, "_"),
                email: profile.emails[0].value,
                password: profile.id,
                authType: "google",
            }

            const user = await createUser(userData);

            return done(null, user);

        } catch (err) {
            return done(err, null);
        }

    }
));

export default passport;