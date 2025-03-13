import supabase from "./supabase-config.js";

document.addEventListener('DOMContentLoaded', () => {
  const signUpBtn = document.getElementById('signUpBtn');
  const errorMessage = document.getElementById('errorMessage');

  signUpBtn.addEventListener('click', async () => {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate that all fields are filled out
    if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
      errorMessage.textContent = "Please fill out all fields.";
      errorMessage.style.display = "block";
      return;
    }
    // Validate that passwords match
    if (password !== confirmPassword) {
      errorMessage.textContent = "Passwords do not match.";
      errorMessage.style.display = "block";
      return;
    }

    let authUserId = null;
    try {
      // Try signing up the user using Supabase Auth.
      // Email confirmations should be disabled for immediate registration.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName, username: username }
        }
      });

      if (error) {
        // If the error indicates the user is already registered, then sign in instead.
        if (error.message.toLowerCase().includes("already registered")) {
          console.log("User already registered, signing in...");
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) {
            errorMessage.textContent = signInError.message;
            errorMessage.style.display = "block";
            return;
          }
          authUserId = signInData.user.id;
          console.log("Authenticated user id from sign in:", authUserId);
        } else {
          errorMessage.textContent = error.message;
          errorMessage.style.display = "block";
          return;
        }
      } else {
        console.log("Sign-up successful:", data);
        authUserId = data.user.id;
        console.log("Authenticated user id from sign up:", authUserId);
      }

      // Check if a user record exists in the Users table by email.
      let { data: existingUser } = await supabase
        .from('Users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        console.log("Existing user record found in Users table with id:", existingUser.id);
        // Optionally, if the existing record's id doesn't match authUserId, you could delete it and insert a new record.
        if (existingUser.id !== authUserId) {
          console.log("Existing user record id does not match authenticated user id. Deleting old record...");
          await supabase.from('Users').delete().eq('email', email);
          existingUser = null;
        }
      }

      // If no record exists, insert a new record into the Users table.
      if (!existingUser) {
        console.log("Inserting new user record with id:", authUserId);
        const { error: insertError } = await supabase
          .from('Users')
          .insert([{
            id: authUserId,
            first_name: firstName,
            last_name: lastName,
            username: username,
            email: email,
            profile_image: "https://zobmevhwmacbmierdlca.supabase.co/storage/v1/object/public/profile-images//default.jpg"
          }]);
        if (insertError) {
          errorMessage.textContent = insertError.message;
          errorMessage.style.display = "block";
          console.error("Error inserting user into Users table:", insertError.message);
          return;
        } else {
          console.log("User successfully inserted into Users table with id:", authUserId);
        }
      }

      // Redirect to home page after successful registration/sign in.
      window.location.href = "home.html";

    } catch (err) {
      console.error("Error during sign-up process:", err);
      errorMessage.textContent = "Error during sign-up. Please try again.";
      errorMessage.style.display = "block";
    }
  });
});
