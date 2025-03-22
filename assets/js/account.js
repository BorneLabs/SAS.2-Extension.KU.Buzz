import supabase from "./supabase-config.js";

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("No authenticated user.");
    window.location.href = "index.html";
    return;
  }
  const userId = user.id;
  const { data: userRecord, error } = await supabase
    .from('Users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !userRecord) {
    alert("User record not found. Please sign out and sign in again.");
    window.location.href = "index.html";
    return;
  }
  const currentUser = userRecord;
  
  const defaultProfileImage = "Assets/Images/default-logo.jpg";
  const profileImage = currentUser.profile_image || defaultProfileImage;
  const username = currentUser.username || "Current Username";

  const currentProfileImageElem = document.getElementById('currentProfileImage');
  const currentUsernameElem = document.getElementById('currentUsername');
  currentProfileImageElem.src = profileImage;
  currentUsernameElem.textContent = username;

  const backBtn = document.getElementById('backBtn');
  backBtn.addEventListener('click', () => {
    window.location.href = "home.html";
  });

  const changeBtn = document.getElementById('changeBtn');
  const accountPopup = document.getElementById('accountPopup');
  const okBtn = document.getElementById('okBtn');
  const newProfileImageInput = document.getElementById('newProfileImage');
  const newUsernameInput = document.getElementById('newUsername');
  const popupPreviewImage = document.getElementById('popupPreviewImage');

  changeBtn.addEventListener('click', () => {
    if (changeBtn.textContent.trim() === "Save") {
      window.location.href = "home.html";
    } else {
      accountPopup.style.display = 'block';
    }
  });

  newProfileImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
      alert("No file selected.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      popupPreviewImage.style.display = 'block';
      popupPreviewImage.src = e.target.result;
    };
    reader.onerror = () => alert("Error reading file.");
    reader.readAsDataURL(file);
  });

  okBtn.addEventListener('click', async () => {
    let updatedProfileImage = currentUser.profile_image || defaultProfileImage;
    let updatedUsername = currentUser.username || "Current Username";
    const file = newProfileImageInput.files[0];

    if (file) {
      if (currentUser.profile_image && currentUser.profile_image !== defaultProfileImage && currentUser.profile_image.includes('/profile-images/')) {
        const parts = currentUser.profile_image.split('/profile-images/');
        if (parts.length === 2) {
          const filePath = parts[1].split('?')[0];
          await supabase.storage.from('profile-images').remove([filePath]);
        }
      }
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
    }
    if (newUsernameInput.value.trim() !== "") {
      updatedUsername = newUsernameInput.value.trim();
    }

    const { error: updateError } = await supabase
      .from('Users')
      .update({ username: updatedUsername, profile_image: updatedProfileImage })
      .eq('id', userId);
    if (updateError) {
      alert("Error updating user profile: " + updateError.message);
      return;
    }

    currentProfileImageElem.src = updatedProfileImage;
    currentUsernameElem.textContent = updatedUsername;

    accountPopup.style.display = 'none';
    newProfileImageInput.value = "";
    newUsernameInput.value = "";
    popupPreviewImage.style.display = 'none';
  });
});
