const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/userModel'); 

/**
 * Extracts the username from an email address.
 * 
 * @param {string} email - The email address.
 * @returns {string} - The extracted username.
 */
function extractUsername(email) {
    if (!email) {
        throw new Error("Email is required");
    }
    
    const atIndex = email.indexOf('@');
    if (atIndex === -1) {
        throw new Error("Invalid email format");
    }
    
    return email.substring(0, atIndex);
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://guitman.shop/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    
    try {
        let user = await User.findOne({ googleId: profile.id });
        const email = profile.emails[0].value;
        const username = extractUsername(email);
        if (!user) {
            user = new User({
                googleId: profile.id,
                first_name: profile.name.givenName || username ||' ',
                last_name: profile.name.familyName || ' ',
                email: email,
                profile_image: profile.photos[0].value
            });
            await user.save();
        }
        const token = jwt.sign({ id: user._id, email: email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        done(null, { user, token });
    } catch (error) {
        done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
