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

  // Consolidated event listener for "Change" button
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
    const file = newProfileImage.files[0];
    if (file) {
      // Upload file to Supabase Storage (assuming a bucket "profile-images" is created)
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
      currentProfileImage.src = publicURLData.publicURL;
      localStorage.setItem(PROFILE_PHOTO_KEY, publicURLData.publicURL);
    }
    if (newUsername.value.trim() !== "") {
      currentUsername.textContent = newUsername.value.trim();
      localStorage.setItem(USERNAME_KEY, newUsername.value.trim());
    }
    changeBtn.textContent = "Save";
    accountPopup.style.display = 'none';
    newProfileImage.value = "";
    newUsername.value = "";
    popupPreviewImage.style.display = 'none';
  });
});
