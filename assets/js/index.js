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
    
    // Sign in using Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      errorMessage.textContent = error.message;
      errorMessage.style.display = "block";
      return;
    }
    
    const authUserId = data.user.id;
    console.log("Authenticated user id from sign in:", authUserId);
    
    // Check if a user record exists with this id.
    let { data: userProfile, error: profileError } = await supabase
      .from('Users')
      .select('*')
      .eq('id', authUserId)
      .single();
      
    if (!userProfile) {
      console.log("No user record found with id", authUserId, ". Checking by email...");
      // Check if there is a record with the same email but a different id.
      let { data: existingUser } = await supabase
        .from('Users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (existingUser) {
        console.log("Found existing user record with mismatched id:", existingUser.id);
        // Delete the mismatched record.
        const { error: deleteError } = await supabase
          .from('Users')
          .delete()
          .eq('email', email);
        if (deleteError) {
          console.error("Error deleting old user record:", deleteError.message);
        } else {
          console.log("Old user record deleted.");
        }
      }
      
      // Insert a new record with the authenticated user's id.
      console.log("Inserting new user record with id:", authUserId);
      const { data: newProfile, error: insertError } = await supabase
        .from('Users')
        .insert([{
          id: authUserId,
          first_name: "Default",
          last_name: "User",
          username: "DefaultUser",
          email: email,
          profile_image: "https://zobmevhwmacbmierdlca.supabase.co/storage/v1/object/public/profile-images/default.png"
        }])
        .single();
      if (insertError) {
        console.error("Error inserting new profile:", insertError.message);
      } else {
        userProfile = newProfile;
        console.log("New user profile inserted:", newProfile);
      }
    } else {
      console.log("User profile found:", userProfile);
    }
    
    // Store profile details for later pages.
    localStorage.setItem('username', userProfile.username);
    localStorage.setItem('profileImage', userProfile.profile_image);
    
    window.location.href = "home.html";
  });

  signUpBtn.addEventListener('click', () => {
    window.location.href = "signup.html";
  });
});
