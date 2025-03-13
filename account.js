import supabase from "./supabase-config.js";

document.addEventListener('DOMContentLoaded', async () => {
  const PROFILE_PHOTO_KEY = 'profileImage';
  const USERNAME_KEY = 'username';

  const backBtn = document.getElementById('backBtn');
  const changeBtn = document.getElementById('changeBtn');
  const accountPopup = document.getElementById('accountPopup');
  const okBtn = document.getElementById('okBtn');
  const newProfileImage = document.getElementById('newProfileImage');
  const newUsername = document.getElementById('newUsername');
  const popupPreviewImage = document.getElementById('popupPreviewImage');
  const currentProfileImage = document.getElementById('currentProfileImage');
  const currentUsername = document.getElementById('currentUsername');

  // Load current profile info from localStorage (or set defaults)
  const storedUsername = localStorage.getItem(USERNAME_KEY) || "Current Username";
  currentUsername.textContent = storedUsername;
  const storedProfileImage = localStorage.getItem(PROFILE_PHOTO_KEY) || "Assets/Images/default-logo.jpg";
  currentProfileImage.src = storedProfileImage;

  backBtn.addEventListener('click', () => {
    window.location.href = "home.html";
  });

  // Show popup when "Change" button is clicked
  changeBtn.addEventListener('click', () => {
    if (changeBtn.textContent.trim() === "Save") {
      window.location.href = "home.html";
    } else {
      accountPopup.style.display = 'block';
    }
  });

  newProfileImage.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) {
      alert("No file selected.");
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      popupPreviewImage.style.display = 'block';
      popupPreviewImage.src = e.target.result;
    };
    reader.onerror = function() {
      alert("Error reading file.");
    };
    reader.readAsDataURL(file);
  });

  okBtn.addEventListener('click', async () => {
    // Retrieve the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("No authenticated user.");
      return;
    }
    const userId = user.id;

    let updatedProfileImage = storedProfileImage;
    let updatedUsername = storedUsername;

    const file = newProfileImage.files[0];
    if (file) {
      // Upload the new profile image to Supabase Storage (bucket "profile-images")
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(`public/${Date.now()}_${file.name}`, file);
      if (uploadError) {
        alert("Error uploading image: " + uploadError.message);
        return;
      }
      const { data: publicURLData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(uploadData.path);
      updatedProfileImage = publicURLData.publicUrl;
      currentProfileImage.src = updatedProfileImage;
      localStorage.setItem(PROFILE_PHOTO_KEY, updatedProfileImage);
    }
    if (newUsername.value.trim() !== "") {
      updatedUsername = newUsername.value.trim();
      currentUsername.textContent = updatedUsername;
      localStorage.setItem(USERNAME_KEY, updatedUsername);
    }
    
    // Update the Users table record for the authenticated user
    const { error: updateError } = await supabase
      .from('Users')
      .update({ username: updatedUsername, profile_image: updatedProfileImage })
      .eq('id', userId);
    if (updateError) {
      alert("Error updating user profile: " + updateError.message);
      return;
    }
    
    changeBtn.textContent = "Save";
    accountPopup.style.display = 'none';
    newProfileImage.value = "";
    newUsername.value = "";
    popupPreviewImage.style.display = 'none';
  });
});
