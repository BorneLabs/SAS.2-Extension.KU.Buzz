import supabase from "./supabase-config.js";

document.addEventListener('DOMContentLoaded', async () => {
  const signUpBtn = document.getElementById('signUpBtn');
  const errorMessage = document.getElementById('errorMessage');

  signUpBtn.addEventListener('click', async () => {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
      errorMessage.textContent = "Please fill out all fields.";
      errorMessage.style.display = "block";
      return;
    }
    if (password !== confirmPassword) {
      errorMessage.textContent = "Passwords do not match.";
      errorMessage.style.display = "block";
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email, password
      }, {
        data: { firstName, lastName, username }
      });
      if (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = "block";
        return;
      }
      // Optionally, add extra info to a "users" table here
      window.location.href = "home.html";
    } catch (err) {
      console.error("Error during sign-up:", err);
      errorMessage.textContent = "Error during sign-up. Please try again.";
      errorMessage.style.display = "block";
    }
  });
});
