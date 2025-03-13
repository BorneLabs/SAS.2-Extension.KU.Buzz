import supabase from "./supabase-config.js";

let currentUser; // Global variable for the authenticated user's record

document.addEventListener('DOMContentLoaded', async () => {
  // Retrieve the authenticated user from Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user ? user.id : null;
  console.log("Authenticated user id in home.js:", userId);
  if (!userId) {
    console.error("No authenticated user found. Redirecting to sign in.");
    window.location.href = "index.html";
    return;
  }
  
  // Retrieve and store the user record from the Users table
  const { data: userRecord, error: userRecordError } = await supabase
    .from('Users')
    .select('*')
    .eq('id', userId)
    .single();
  console.log("User record from Users table:", userRecord, userRecordError);
  if (!userRecord) {
    window.alert("Your profile was not found in our database. Please sign out and sign in again.");
    window.location.href = "index.html";
    return;
  }
  currentUser = userRecord;
  
  // DOM Elements
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
  
  // Preview the selected image for a new post
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
  
  // Create a post on button click or pressing Enter (without Shift)
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
  
  // Initial fetch of posts (and their comments)
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
  
  // Create a new post linked to the authenticated user
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
    fetchPosts(); // Refresh posts to include the new post and its comments
  }
  
  // Fetch posts with joined user info and their comments, ordered by created_at descending
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
    for (const post of data) {
      const postElement = createPostElement(post);
      postsContainer.appendChild(postElement);
      await fetchComments(post.id, postElement);
    }
  }
  
  // Create a DOM element for a post
  function createPostElement(post) {
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
      <div class="comments-section" style="display: none;">
        <div class="comments-container"></div>
        <div class="comment-input">
          <textarea placeholder="Add a comment..." rows="2"></textarea>
          <button class="comment-btn">Comment</button>
        </div>
      </div>
    `;
    setupPostInteractions(postArticle, post.id);
    return postArticle;
  }
  
  // Set up comment toggle and submission for a post element
  function setupPostInteractions(postElement, postId) {
    const toggleBtn = postElement.querySelector('.toggle-comments-btn');
    const commentsSection = postElement.querySelector('.comments-section');
    if (toggleBtn && commentsSection) {
      toggleBtn.addEventListener('click', () => {
        if (commentsSection.style.display === 'none' || commentsSection.style.display === '') {
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
      commentBtn.addEventListener('click', async () => {
        const commentText = commentTextarea.value.trim();
        if (commentText) {
          await createComment(postId, commentText, commentsContainer);
          commentTextarea.value = '';
        }
      });
      commentTextarea.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const commentText = commentTextarea.value.trim();
          if (commentText) {
            await createComment(postId, commentText, commentsContainer);
            commentTextarea.value = '';
          }
        }
      });
    }
  }
  
  // Insert a new comment into the Comments table and display it immediately
  async function createComment(postId, commentText, commentsContainer) {
    const { data, error } = await supabase
      .from('Comments')
      .insert([{ post_id: postId, user_id: userId, comment_text: commentText }])
      .single();
    if (error) {
      console.error("Error saving comment:", error.message);
      return;
    }
    console.log("Comment saved:", data);
    // If the returned comment doesn't include the joined Users info, set it to currentUser
    if (!data.Users) {
      data.Users = currentUser;
    }
    addCommentToDOM(data, commentsContainer);
    
    // Ensure the comment section is visible
    const commentsSection = commentsContainer.parentElement;
    if (!commentsSection || commentsSection.style.display === 'none' || commentsSection.style.display === '') {
      commentsSection.style.display = 'block';
      const toggleBtn = commentsSection.parentElement.querySelector('.toggle-comments-btn');
      if (toggleBtn) {
        toggleBtn.textContent = 'Hide Comments';
      }
    }
  }
  
  // Fetch comments for a given post and display them in its comments container (newest first)
  async function fetchComments(postId, postElement) {
    const { data, error } = await supabase
      .from('Comments')
      .select(`
        id, comment_text, created_at, user_id,
        Users (username, profile_image)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error("Error fetching comments:", error.message);
      return;
    }
    const commentsContainer = postElement.querySelector('.comments-container');
    commentsContainer.innerHTML = "";
    data.forEach(comment => {
      addCommentToDOM(comment, commentsContainer);
    });
  }
  
  // Append a comment element to the DOM at the top of the comments container
  function addCommentToDOM(comment, container) {
    const commenterImage = comment.Users?.profile_image || currentUser.profile_image || "https://zobmevhwmacbmierdlca.supabase.co/storage/v1/object/public/profile-images//default.jpg";
    const commenterUsername = comment.Users?.username || currentUser.username || "Unknown User";
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.innerHTML = `
      <img src="${commenterImage}" alt="Commenter">
      <p class="comment-text"><strong>@${commenterUsername}:</strong> ${comment.comment_text}</p>
    `;
    container.insertBefore(commentDiv, container.firstChild);
  }
  
  // Close the new post popup and reset its fields
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
