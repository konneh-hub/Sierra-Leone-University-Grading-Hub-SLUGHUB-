// System Admin Login JavaScript

function getAuthToken() {
  return localStorage.getItem('authToken');
}

function setAuthToken(token) {
  localStorage.setItem('authToken', token);
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function showSuccess(message) {
  const successDiv = document.getElementById('successMessage');
  successDiv.textContent = message;
  successDiv.style.display = 'block';
}

function clearMessages() {
  document.getElementById('errorMessage').style.display = 'none';
  document.getElementById('successMessage').style.display = 'none';
}

// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
  if (getAuthToken()) {
    window.location.href = '/system-admin/dashboard';
  }

  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const btnText = document.getElementById('btnText');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }

    // Disable button and show loading state
    loginBtn.disabled = true;
    const originalText = btnText.textContent;
    btnText.innerHTML = '<span class="loading-spinner"></span>Logging in...';

    try {
      // Try to authenticate with the system admin auth endpoint
      const response = await fetch('/api/system-admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store the token
      if (data.data && data.data.token) {
        setAuthToken(data.data.token);

        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberEmail', email);
        }

        showSuccess('Login successful! Redirecting...');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = '/system-admin/dashboard/overview';
        }, 1000);
      } else {
        throw new Error('No token received from server');
      }
    } catch (error) {
      showError(error.message || 'An error occurred during login');
      loginBtn.disabled = false;
      btnText.textContent = originalText;
    }
  });

  // Load remembered email if available
  const rememberedEmail = localStorage.getItem('rememberEmail');
  if (rememberedEmail) {
    document.getElementById('email').value = rememberedEmail;
    document.getElementById('rememberMe').checked = true;
  }
});
