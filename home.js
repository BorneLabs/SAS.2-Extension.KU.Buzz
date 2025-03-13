import supabase from "./supabase-config.js";

document.addEventListener('DOMContentLoaded', async () => {
  // Update header profile image with cache busting
  const profileBtnImg = document.querySelector('.profile-btn img');
  const storedProfileImage = localStorage.getItem('profileImage') || "Assets/Images/default-logo.jpg";
  if (profileBtnImg) {
    profileBtnImg.src = storedProfileImage + '?v=' + new Date().getTime();
  }

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user ? user.id : null;
  if (!userId) {
    window.location.href = "index.html";
    return;
  }
  
  // Get user record from Users table
  const { data: userRecord, error: userRecordError } = await supabase
    .from('Users')
    .select('*')
    .eq('id', userId)
    .single();
  if (!userRecord) {
    window.alert("Your profile was not found. Please sign out and sign in again.");
    window.location.href = "index.html";
    return;
  }
  const currentUser = userRecord;
  
  // DOM elements
  const postsContainer = document.getElementById('postsContainer');
  const floatingPostBtn = document.getElementById('floatingPostBtn');
  const newPostPopup = document.getElementById('newPostPopup');
  const popupCloseBtn = document.getElementById('popupCloseBtn');
  const popupPostText = document.getElementById('popupPostText');
  const popupImageUpload = document.getElementById('popupImageUpload');
  const popupImagePreview = document.getElementById('popupImagePreview');
  const popupPostBtn = document.getElementById('popupPostBtn');
  const charCount = document.getElementById('charCount'); // Character counter element
  
  let popupCurrentImage = null;
  
  // Update character counter on input
  popupPostText.addEventListener('input', () => {
    const length = popupPostText.value.length;
    charCount.textContent = `${length}/750`;
  });
  
  // Open new post popup
  if (floatingPostBtn) {
    floatingPostBtn.addEventListener('click', () => {
      newPostPopup.style.display = 'block';
    });
  }
  
  if (popupCloseBtn) {
    popupCloseBtn.addEventListener('click', closePopup);
  }
  
  // Preview image upload for new post
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
  
  // Fetch posts initially
  fetchPosts();
  
  // Real-time subscription for new comments
  const commentSubscription = supabase
    .channel('comments')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Comments' }, (payload) => {
      const newComment = payload.new;
      const postElement = document.querySelector(`article[data-post-id="${newComment.post_id}"]`);
      if (postElement) {
        const commentsContainer = postElement.querySelector('.comments-container');
        if (!newComment.Users) {
          newComment.Users = { username: currentUser.username, profile_image: currentUser.profile_image };
        }
        addCommentToDOM(newComment, commentsContainer);
      }
    })
    .subscribe();
  
  // Helper: Convert Data URL to Blob
  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
  
  // Create new post with a 750-character limit
  async function createPost(content, imageDataUrl) {
    if (content.length > 750) {
      alert("Your post cannot exceed 750 characters.");
      return;
    }
    if (!content && !imageDataUrl) return;
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
    }
    const { data, error } = await supabase
      .from('Posts')
      .insert([{ content, image_url: imageUrl, user_id: userId }])
      .single();
    if (error) {
      console.error("Error saving post:", error.message);
      return;
    }
    fetchPosts();
  }
  
  // Fetch posts and their comments
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
    postArticle.setAttribute('data-post-id', post.id);
    const userProfileImage = post.Users?.profile_image || "Assets/Images/default-logo.jpg";
    const username = post.Users?.username || "Unknown User";
    postArticle.innerHTML = `
      <div class="post-author">
        <img src="${userProfileImage}" alt="Author">
        <span>@${username}</span>
      </div>
      <div class="post-content">
        ${post.content ? `<p>${post.content}</p>` : ''}
        ${post.image_url ? `<img src="${post.image_url}" alt="Post Image">` : ''}
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
  
  // Insert a new comment and display it immediately
  async function createComment(postId, commentText, commentsContainer) {
    const { data, error } = await supabase
      .from('Comments')
      .insert([{ post_id: postId, user_id: userId, comment_text: commentText }])
      .select()
      .single();
    if (error) {
      console.error("Error saving comment:", error.message);
      return;
    }
    if (!data) return;
    if (!data.Users) {
      data.Users = currentUser;
    }
    addCommentToDOM(data, commentsContainer);
    
    const commentsSection = commentsContainer.parentElement;
    if (!commentsSection || commentsSection.style.display === 'none') {
      commentsSection.style.display = 'block';
      const toggleBtn = commentsSection.parentElement.querySelector('.toggle-comments-btn');
      if (toggleBtn) {
        toggleBtn.textContent = 'Hide Comments';
      }
    }
  }
  
  // Fetch comments for a given post
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
  
  // Add comment to DOM
  function addCommentToDOM(comment, container) {
    const commenterImage = comment.Users?.profile_image || currentUser.profile_image || "Assets/Images/default-logo.jpg";
    const commenterUsername = comment.Users?.username || currentUser.username || "Unknown User";
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.innerHTML = `
      <img src="${commenterImage}" alt="Commenter">
      <div class="comment-body">
        <p class="comment-username">@${commenterUsername}</p>
        <p class="comment-text">${comment.comment_text}</p>
      </div>
    `;
    container.insertBefore(commentDiv, container.firstChild);
  }
  
  // Close new post popup and reset fields
  function closePopup() {
    if (popupPostText) popupPostText.value = '';
    if (popupImagePreview) {
      popupImagePreview.innerHTML = '';
      popupImagePreview.style.display = 'none';
    }
    popupCurrentImage = null;
    if (newPostPopup) newPostPopup.style.display = 'none';
    if (popupImageUpload) popupImageUpload.value = '';
    // Reset the character counter as well
    charCount.textContent = '0/750';
  }
});
