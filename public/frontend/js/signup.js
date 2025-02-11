// DOM Elements
const signupForm = document.querySelector("form");
const otpModal = document.getElementById("otpModal");
const otpMessage = document.getElementById("otpMessage");
const resendOtpButton = document.getElementById("resendOtpButton");
const resendCountdown = document.getElementById("resendCountdown");
const otpInputs = document.querySelectorAll(".otp-input");
let userEmail;
let countdownInterval;

// Custom Alert System
const createCustomAlert = (type, message) => {
  // Remove any existing alerts
  const existingAlert = document.querySelector('.custom-alert');
  if (existingAlert) {
    existingAlert.remove();
  }

  // Create alert container
  const alertContainer = document.createElement('div');
  alertContainer.className = `custom-alert fixed top-4 right-4 z-50 min-w-[320px] max-w-md transform transition-all duration-300 ease-in-out translate-x-full`;
  
  // Define styles based on type
  const styles = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-400',
      iconColor: 'text-green-400',
      textColor: 'text-green-800',
      icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>`
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
      iconColor: 'text-red-400',
      textColor: 'text-red-800',
      icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>`
    }
  };

  const style = styles[type];

  // Create alert content
  alertContainer.innerHTML = `
    <div class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border ${style.borderColor} ${style.bgColor} shadow-lg ring-1 ring-black ring-opacity-5">
      <div class="p-4">
        <div class="flex items-start">
          <div class="flex-shrink-0 ${style.iconColor}">
            ${style.icon}
          </div>
          <div class="ml-3 w-0 flex-1 pt-0.5">
            <p class="text-sm font-medium ${style.textColor}">${message}</p>
          </div>
          <div class="ml-4 flex flex-shrink-0">
            <button type="button" class="inline-flex rounded-md ${style.bgColor} ${style.textColor} hover:${style.textColor} focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <span class="sr-only">Close</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add alert to document
  document.body.appendChild(alertContainer);

  // Animate in
  setTimeout(() => {
    alertContainer.classList.remove('translate-x-full');
    alertContainer.classList.add('translate-x-0');
  }, 100);

  // Add close button functionality
  const closeButton = alertContainer.querySelector('button');
  closeButton.addEventListener('click', () => {
    alertContainer.classList.remove('translate-x-0');
    alertContainer.classList.add('translate-x-full');
    setTimeout(() => alertContainer.remove(), 300);
  });

  // Auto close after 5 seconds
  setTimeout(() => {
    if (alertContainer.parentElement) {
      alertContainer.classList.remove('translate-x-0');
      alertContainer.classList.add('translate-x-full');
      setTimeout(() => alertContainer.remove(), 300);
    }
  }, 5000);
};

// Modal Functions
function closeOtpModal() {
  otpModal.classList.add("hidden");
}

function openOtpModal() {
  otpModal.classList.remove("hidden");
  otpInputs[0].focus(); // Auto-focus the first OTP input field
}

// OTP Input Handling
otpInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    if (input.value.length === 1 && index < otpInputs.length - 1) {
      otpInputs[index + 1].focus();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && index > 0) {
      otpInputs[index - 1].focus();
    }
  });
});

// Modal Event Listeners
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

// Form Submission Handler
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(signupForm);
  const data = Object.fromEntries(formData.entries());

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
        userEmail = result.email;
        openOtpModal();
        startCountdown(60);
        createCustomAlert('success', "Signup successful! Please verify your email.");
      } else {
        displayInlineErrors(result.errors);
        createCustomAlert('error', "Please correct the errors in the form.");
      }
    } else {
      displayInlineErrors(result.errors || { general: "Signup failed!" });
      createCustomAlert('error', "Signup failed. Please try again.");
    }
  } catch (error) {
    console.error("Signup Error:", error);
    createCustomAlert('error', "An error occurred during signup. Please try again.");
  }
});

// Error Handling Functions
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

// OTP Verification Function
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
        createCustomAlert('success', result.message);
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        createCustomAlert('error', result.error || "Invalid OTP. Please try again.");
        otpMessage.classList.replace("text-gray-600", "text-red-600");
      }
    } catch (error) {
      console.error("OTP Verification Error:", error);
      createCustomAlert('error', "An unexpected error occurred. Please try again.");
      otpMessage.classList.replace("text-gray-600", "text-red-600");
    }
  } else {
    createCustomAlert('error', "Please enter a valid 6-digit OTP.");
    otpMessage.classList.replace("text-gray-600", "text-red-600");
  }
}

// Resend OTP Function
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
      createCustomAlert('success', "New OTP has been sent to your email");
      otpMessage.classList.replace("text-gray-600", "text-green-600");
      startCountdown(60);
    } else {
      createCustomAlert('error', "Failed to resend OTP. Please try again.");
      otpMessage.classList.replace("text-green-600", "text-red-600");
    }
  } catch (error) {
    console.error("Error resending OTP:", error);
    createCustomAlert('error', "An error occurred. Please try again.");
    otpMessage.classList.replace("text-green-600", "text-red-600");
  }
}

// Countdown Function
function startCountdown(seconds) {
  let remainingTime = seconds;
  resendOtpButton.disabled = true;
  resendCountdown.textContent = remainingTime;

  clearInterval(countdownInterval); // Clear any existing interval

  countdownInterval = setInterval(() => {
    remainingTime--;
    resendCountdown.textContent = remainingTime;

    if (remainingTime <= 0) {
      clearInterval(countdownInterval);
      resendOtpButton.disabled = false;
      resendCountdown.textContent = "";
    }
  }, 1000);
}