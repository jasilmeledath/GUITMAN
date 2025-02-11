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
      },
      loading: {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-400',
        iconColor: 'text-blue-400',
        textColor: 'text-blue-800',
        icon: `<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
  
    // Auto close after 5 seconds (except for loading alerts)
    if (type !== 'loading') {
      setTimeout(() => {
        if (alertContainer.parentElement) {
          alertContainer.classList.remove('translate-x-0');
          alertContainer.classList.add('translate-x-full');
          setTimeout(() => alertContainer.remove(), 300);
        }
      }, 5000);
    }
  
    return alertContainer;
  };
  
  // Login Form Handler
  document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
  
    // Clear previous errors
    document.getElementById("emailError").textContent = "";
    document.getElementById("passwordError").textContent = "";
    document.getElementById("emailError").classList.add("hidden");
    document.getElementById("passwordError").classList.add("hidden");
  
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
  
    // Show loading alert
    const loadingAlert = createCustomAlert('loading', 'Logging in...');
  
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
        result = await response.json();
      } catch (jsonError) {
        throw new Error("Invalid response from server");
      }
  
      // Remove loading alert
      loadingAlert.remove();
  
      if (response.ok) {
        // Show success message
        createCustomAlert('success', 'Login successful! Redirecting...');
        
        // Add a small delay for the success message to be visible
        await new Promise(resolve => setTimeout(resolve, 1000));
  
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
          // Show error alert for validation errors
          createCustomAlert('error', 'Please correct the errors in the form.');
        } else if (result.message) {
          // Show error alert for other errors
          createCustomAlert('error', result.message);
        }
      }
    } catch (error) {
      // Remove loading alert
      loadingAlert.remove();
      
      console.error("An error occurred:", error);
      createCustomAlert('error', 'Something went wrong. Please try again later.');
    }
  });