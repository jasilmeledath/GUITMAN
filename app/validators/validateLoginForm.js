const validateLoginForm = (req, res, next) => {
    const errors = {};
    let { email, password } = req.body;

    // Trim input to avoid spaces being counted
    email = email?.trim();
    password = password?.trim();

    // Validate email
    if (!email) {
        errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = "Please enter a valid email address.";
    }

    // Validate password
    if (!password) {
        errors.password = "Password is required.";
    } else {
        const passwordErrors = [];
        if (password.length < 6) passwordErrors.push("at least 6 characters long");
        if (!/[A-Z]/.test(password)) passwordErrors.push("one uppercase letter");
        if (!/[0-9]/.test(password)) passwordErrors.push("one number");

        if (passwordErrors.length > 0) {
            errors.password = `Password must contain ${passwordErrors.join(", ")}.`;
        }
    }

    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            success: false,
            errors,
        });
    }

    next(); // Proceed to the next middleware or controller
};

module.exports = { validateLoginForm };