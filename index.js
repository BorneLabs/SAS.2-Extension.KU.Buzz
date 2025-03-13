import supabase from "./supabase-config.js";

console.log("Index.js loaded");

document.addEventListener('DOMContentLoaded', () => {
  const signInBtn = document.getElementById('signInBtn');
  const signUpBtn = document.getElementById('signUpBtn');
  const errorMessage = document.getElementById('errorMessage');

  console.log("signInBtn:", signInBtn);
  console.log("signUpBtn:", signUpBtn);

  if (!signInBtn) {
    console.error("Sign In button not found");
  }
  if (!signUpBtn) {
    console.error("Sign Up button not found");
  }

  signInBtn.addEventListener('click', async () => {
    console.log("Sign In button clicked");
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
    console.log("Sign Up button clicked");
    window.location.href = "signup.html";
  });
});
