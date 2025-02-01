const validateLoginForm = (req, res, next) => {
    const errors = {};

    const { email, password } = req.body;

    // Validate email
    if (!email || email.trim() === "") {
        errors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
        errors.email = "Please enter a valid email address.";
    }

    // Validate password
    if (!password || password.trim() === "") {
        errors.password = "Password is required.";
    } else if (password.length < 6) {
        errors.password = "Password must be at least 6 characters long.";
    } else if (!/[A-Z]/.test(password)) {
        errors.password = "Password must contain at least one uppercase letter.";
    } else if (!/[0-9]/.test(password)) {
        errors.password = "Password must contain at least one number.";
    }

    // If there are errors, return them
    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ errors });
    }

    next(); // Proceed to the next middleware or controller
};

module.exports = { validateLoginForm };