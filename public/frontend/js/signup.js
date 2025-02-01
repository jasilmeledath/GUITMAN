const signupForm = document.querySelector("form");
const otpModal = document.getElementById("otpModal");
const otpMessage = document.getElementById("otpMessage");
const resendOtpButton = document.getElementById("resendOtpButton");
const resendCountdown = document.getElementById("resendCountdown");
const otpInputs = document.querySelectorAll(".otp-input");
let userEmail;
let countdownInterval;

// Close OTP Modal
function closeOtpModal() {
  otpModal.classList.add("hidden");
}

// Open OTP Modal
function openOtpModal() {
  otpModal.classList.remove("hidden");
  otpInputs[0].focus(); // Auto-focus the first OTP input field
}

// Add event listeners to OTP inputs for auto-focus
otpInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    if (input.value.length === 1 && index < otpInputs.length - 1) {
      otpInputs[index + 1].focus(); // Move focus to the next field
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && index > 0) {
      otpInputs[index - 1].focus(); // Move focus to the previous field
    }
  });
});

// Modal Event Listeners (Add only once)
otpModal.addEventListener("click", (e) => {
  if (e.target === otpModal) {
    closeOtpModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !otpModal.classList.contains("hidden")) {
    closeOtpModal();
  }
});

// Form submit event for signup
signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const formData = new FormData(signupForm);
    const data = Object.fromEntries(formData.entries());
  
    // Clear previous error messages
    clearErrors();
  
    try {
      const response = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
  
      const result = await response.json();
  
      if (response.ok) {
        if (result.success) {
          userEmail = result.email; // Store email for OTP verification
          openOtpModal();
          startCountdown(60); // Start countdown for Resend OTP
        } else {
          displayInlineErrors(result.errors); // Display validation errors below input fields
        }
      } else {
        displayInlineErrors(result.errors || { general: "Signup failed!" });
      }
    } catch (error) {
      console.error("Signup Error:", error);
      alert("An error occurred during signup. Please try again.");
    }
  });
  
  function clearErrors() {
    const errorMessages = signupForm.querySelectorAll(".error-message");
    errorMessages.forEach((message) => message.remove());
  }
  
  function displayInlineErrors(errors) {
    for (const [field, message] of Object.entries(errors)) {
      const inputField = signupForm.querySelector(`[name="${field}"]`);
      if (inputField) {
        const errorMessage = document.createElement("div");
        errorMessage.textContent = message;
        errorMessage.classList.add("text-red-600", "text-sm", "mt-1", "error-message");
        inputField.parentElement.appendChild(errorMessage);
      }
    }
  }

// OTP Verification
async function verifyOTP() {
  const otp = Array.from(otpInputs)
    .map((input) => input.value)
    .join("");

  if (otp.length === 6) {
    try {
      const response = await fetch("/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, otp }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        window.location.href = "/login";
      } else {
        otpMessage.textContent = result.error || "Invalid OTP. Please try again.";
        otpMessage.classList.replace("text-gray-600", "text-red-600");
      }
    } catch (error) {
      console.error("OTP Verification Error:", error);
      otpMessage.textContent = "An unexpected error occurred. Please try again.";
      otpMessage.classList.replace("text-gray-600", "text-red-600");
    }
  } else {
    otpMessage.textContent = "Please enter a valid 6-digit OTP.";
    otpMessage.classList.replace("text-gray-600", "text-red-600");
  }
}

// Resend OTP logic
async function resendOTP() {
    const formData = new FormData(signupForm);
    const data = Object.fromEntries(formData.entries());
    try {
        const response = await fetch('/resend-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            const data = await response.json();
            
            // Handle success
            otpMessage.textContent = "New OTP has been sent to your email";
            otpMessage.classList.replace("text-gray-600", "text-green-600");
            startCountdown(60); // Start countdown for 60 seconds
        } else {
            // Handle error
            otpMessage.textContent = "Failed to resend OTP. Please try again.";
            otpMessage.classList.replace("text-green-600", "text-red-600");
        }
    } catch (error) {
        // Handle network or other errors
        otpMessage.textContent = "An error occurred. Please try again.";
        otpMessage.classList.replace("text-green-600", "text-red-600");
        console.error("Error resending OTP:", error);
    }
}


function startCountdown(seconds) {
  let remainingTime = seconds;
  resendOtpButton.disabled = true;
  resendCountdown.textContent = remainingTime;

  countdownInterval = setInterval(() => {
    remainingTime--;
    resendCountdown.textContent = remainingTime;

    if (remainingTime <= 0) {
      clearInterval(countdownInterval);
      resendOtpButton.disabled = false;
      resendCountdown.textContent = ""; // Clear countdown text
    }
  }, 1000);
}