document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    // Clear previous errors
    document.getElementById("emailError").textContent = "";
    document.getElementById("passwordError").textContent = "";
    document.getElementById("emailError").classList.add("hidden");
    document.getElementById("passwordError").classList.add("hidden");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        let result;
        try {
            // Parse JSON response
            result = await response.json();
        } catch (jsonError) {
            throw new Error("Invalid response from server");
        }

        if (response.ok) {
            // Make a GET request to load the home page
            const homeResponse = await fetch("/home", {
                method: "GET",
                headers: {
                    "Content-Type": "text/html",
                },
            });

            const homeHtml = await homeResponse.text();
            document.open();
            document.write(homeHtml);
            document.close();
        } else {
            // Display validation errors
            if (result.errors) {
                if (result.errors.email) {
                    document.getElementById("emailError").textContent = result.errors.email;
                    document.getElementById("emailError").classList.remove("hidden");
                }
                if (result.errors.password) {
                    document.getElementById("passwordError").textContent = result.errors.password;
                    document.getElementById("passwordError").classList.remove("hidden");
                }
            } else if (result.message) {
                // Display a generic error message
                alert(result.message);
            }
        }
    } catch (error) {
        console.error("An error occurred:", error);
        alert("Something went wrong. Please try again later.");
    }
});
