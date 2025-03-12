import supabase from "./supabase-config.js";

document.addEventListener('DOMContentLoaded', async () => {
  const signInBtn = document.getElementById('signInBtn');
  const signUpBtn = document.getElementById('signUpBtn');
  const errorMessage = document.getElementById('errorMessage');

  signInBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      errorMessage.textContent = "Please fill out both fields.";
      errorMessage.style.display = "block";
      return;
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      errorMessage.textContent = error.message;
      errorMessage.style.display = "block";
    } else {
      window.location.href = "home.html";
    }
  });

  signUpBtn.addEventListener('click', () => {
    window.location.href = "signup.html";
  });
});
