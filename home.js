import supabase from "./supabase-config.js";

document.addEventListener('DOMContentLoaded', async () => {
  // Retrieve the authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user ? user.id : null;
  console.log("Authenticated user id in home.js:", userId);
  if (!userId) {
    console.error("No authenticated user found. Redirecting to sign in.");
    window.location.href = "index.html";
    return;
  }

  // Check if a user record exists in the Users table with the same id
  const { data: userRecord, error: userRecordError } = await supabase
    .from('Users')
    .select('*')
    .eq('id', userId)
    .single();
  console.log("User record from Users table:", userRecord, userRecordError);
  if (!userRecord) {
    console.error("No matching user record in Users table for user id:", userId);
    window.alert("Your profile was not found in our database. Please sign out and sign in again.");
    window.location.href = "index.html";
    return;
  }

  // DOM Elements for posts and new post popup
  const postsContainer = document.getElementById('postsContainer');
  const floatingPostBtn = document.getElementById('floatingPostBtn');
  const newPostPopup = document.getElementById('newPostPopup');
  const popupCloseBtn = document.getElementById('popupCloseBtn');
  const popupPostText = document.getElementById('popupPostText');
  const popupImageUpload = document.getElementById('popupImageUpload');
  const popupImagePreview = document.getElementById('popupImagePreview');
  const popupPostBtn = document.getElementById('popupPostBtn');

  let popupCurrentImage = null;

  // Open the new post popup
  if (floatingPostBtn) {
    floatingPostBtn.addEventListener('click', () => {
      newPostPopup.style.display = 'block';
    });
  } else {
    console.error("Floating Post Button not found");
  }

  if (popupCloseBtn) {
    popupCloseBtn.addEventListener('click', closePopup);
  }

  // When an image is selected, preview it
  if (popupImageUpload) {
    popupImageUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        popupImagePreview.style.display = 'block';
        popupImagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        popupCurrentImage = e.target.result;
      };
      reader.onerror = () => alert("Error reading file.");
      reader.readAsDataURL(file);
    });
  }

  // Create post on button click or pressing Enter (without Shift)
  if (popupPostBtn) {
    popupPostBtn.addEventListener('click', async () => {
      await createPost(popupPostText.value.trim(), popupCurrentImage);
      closePopup();
    });
  }
  if (popupPostText) {
    popupPostText.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        await createPost(popupPostText.value.trim(), popupCurrentImage);
        closePopup();
      }
    });
  }

  fetchPosts();

  // --- FUNCTIONS ---

  // Convert a Data URL to a Blob for image upload
  function dataURLtoBlob(dataurl) {
    let arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  // Create a new post, linking it to the authenticated user
  async function createPost(content, imageDataUrl) {
    if (!content && !imageDataUrl) {
      console.warn("No content or image provided for the post.");
      return;
    }
    let imageUrl = null;
    if (imageDataUrl) {
      const fileName = `post_${Date.now()}.png`;
      const imageBlob = dataURLtoBlob(imageDataUrl);
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('post-images')
        .upload(fileName, imageBlob);
      if (uploadError) {
        console.error("Error uploading image:", uploadError.message);
        return;
      }
      const { data: publicUrlData, error: publicUrlError } = supabase
        .storage
        .from('post-images')
        .getPublicUrl(fileName);
      if (publicUrlError) {
        console.error("Error getting public URL:", publicUrlError.message);
      }
      imageUrl = publicUrlData.publicUrl;
      console.log("Image uploaded successfully. URL:", imageUrl);
    }

    const { data, error } = await supabase
      .from('Posts')
      .insert([{ content: content, image_url: imageUrl, user_id: userId }]);
    if (error) {
      console.error("Error saving post:", error.message);
      return;
    }
    console.log("Post saved:", data);
    fetchPosts(); // Refresh posts to show the updated order
  }

  // Fetch posts along with user details using a join on Users, ordered by created_at descending
  async function fetchPosts() {
    const { data, error } = await supabase
      .from('Posts')
      .select(`
        id, content, image_url, created_at, user_id,
        Users (username, profile_image)
      `)
      .order('created_at', { ascending: false });
    if (error) {
      console.error("Error fetching posts:", error.message);
      return;
    }
    console.log("Fetched posts:", data);
    postsContainer.innerHTML = "";
    // Since the data is already in descending order, appending in order will keep the newest on top.
    data.forEach(post => {
      displayPost(post);
    });
  }

  // Render a post with the correct user details
  function displayPost(post) {
    const postArticle = document.createElement('article');
    postArticle.className = 'post';

    const userProfileImage = post.Users?.profile_image || "https://zobmevhwmacbmierdlca.supabase.co/storage/v1/object/public/profile-images//default.jpg";
    const username = post.Users?.username || "Unknown User";

    postArticle.innerHTML = `
      <div class="post-content">
        ${post.image_url ? `<img src="${post.image_url}" alt="Post Image">` : ''}
        ${post.content ? `<p>${post.content}</p>` : ''}
      </div>
      <div class="post-author">
        <img src="${userProfileImage}" alt="Author">
        <span>@${username}</span>
      </div>
      <button class="toggle-comments-btn">Show Comments</button>
      <div class="comments-section">
        <div class="comments-container"></div>
        <div class="comment-input">
          <textarea placeholder="Add a comment..." rows="2"></textarea>
          <button class="comment-btn">Comment</button>
        </div>
      </div>
    `;
    setupPostInteractions(postArticle);
    postsContainer.appendChild(postArticle); // Append to maintain order from query
  }

  // Set up comment toggling and adding for a post element
  function setupPostInteractions(postElement) {
    const toggleBtn = postElement.querySelector('.toggle-comments-btn');
    const commentsSection = postElement.querySelector('.comments-section');
    if (toggleBtn && commentsSection) {
      toggleBtn.addEventListener('click', () => {
        if (!commentsSection.style.display || commentsSection.style.display === 'none') {
          commentsSection.style.display = 'block';
          toggleBtn.textContent = 'Hide Comments';
        } else {
          commentsSection.style.display = 'none';
          toggleBtn.textContent = 'Show Comments';
        }
      });
    }
    const commentBtn = postElement.querySelector('.comment-btn');
    const commentTextarea = postElement.querySelector('.comment-input textarea');
    const commentsContainer = postElement.querySelector('.comments-container');
    if (commentBtn && commentTextarea && commentsContainer) {
      commentBtn.addEventListener('click', () => {
        const commentText = commentTextarea.value.trim();
        if (commentText) {
          addComment(commentsContainer, commentText);
          commentTextarea.value = '';
        }
      });
      commentTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const commentText = commentTextarea.value.trim();
          if (commentText) {
            addComment(commentsContainer, commentText);
            commentTextarea.value = '';
          }
        }
      });
    }
  }

  // Append a new comment element (front-end only)
  function addComment(container, text) {
    // Use the currently authenticated user's profile image from userRecord if available
    const commenterImage = userRecord?.profile_image || "https://zobmevhwmacbmierdlca.supabase.co/storage/v1/object/public/profile-images//default.jpg";
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.innerHTML = `
      <img src="${commenterImage}" alt="Commenter">
      <p class="comment-text">${text}</p>
    `;
    container.appendChild(commentDiv);
  }

  // Close the new post popup and reset input fields
  function closePopup() {
    if (popupPostText) popupPostText.value = '';
    if (popupImagePreview) {
      popupImagePreview.innerHTML = '';
      popupImagePreview.style.display = 'none';
    }
    popupCurrentImage = null;
    if (newPostPopup) newPostPopup.style.display = 'none';
    if (popupImageUpload) popupImageUpload.value = '';
  }
});
