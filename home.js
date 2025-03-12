import supabase from "./supabase-config.js";

document.addEventListener('DOMContentLoaded', async () => {
  const PROFILE_PHOTO_KEY = 'profileImage';
  const USERNAME_KEY = 'username';
  const defaultProfileImage = "Assets/Images/default-logo.jpg";
  const storedProfileImage = localStorage.getItem(PROFILE_PHOTO_KEY) || defaultProfileImage;
  const storedUsername = localStorage.getItem(USERNAME_KEY) || "KU_User";

  // Update header profile button image if present
  const headerProfileImg = document.querySelector('.profile-btn img');
  if (headerProfileImg) {
    headerProfileImg.src = storedProfileImage;
  }
  
  function getPostMarkup(text, postImage) {
    return `
      <div class="post-content">
        ${postImage ? `<img src="${postImage}" alt="Post Image">` : ''}
        ${text ? `<p>${text}</p>` : ''}
      </div>
      <div class="post-author">
        <img src="${storedProfileImage}" alt="Author">
        <span>@${storedUsername}</span>
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
  }
  
  const postsContainer = document.getElementById('postsContainer');
  const floatingPostBtn = document.getElementById('floatingPostBtn');
  const newPostPopup = document.getElementById('newPostPopup');
  const popupCloseBtn = document.getElementById('popupCloseBtn');
  const popupPostText = document.getElementById('popupPostText');
  const popupImageUpload = document.getElementById('popupImageUpload');
  const popupImagePreview = document.getElementById('popupImagePreview');
  const popupPostBtn = document.getElementById('popupPostBtn');
  
  let popupCurrentImage = null;
  
  if (floatingPostBtn) {
    floatingPostBtn.addEventListener('click', () => {
      newPostPopup.style.display = 'block';
    });
  }
  
  if (popupCloseBtn) {
    popupCloseBtn.addEventListener('click', closePopup);
  }
  
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
    popupPostBtn.addEventListener('click', () => {
      createPost(popupPostText.value.trim(), popupCurrentImage);
      closePopup();
    });
  }
  
  if (popupPostText) {
    popupPostText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        createPost(popupPostText.value.trim(), popupCurrentImage);
        closePopup();
      }
    });
  }
  
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
  
  function createPost(text, image) {
    if (!text && !image) return;
    const postArticle = document.createElement('article');
    postArticle.className = 'post';
    postArticle.innerHTML = getPostMarkup(text, image);
    setupPostInteractions(postArticle);
    if (postsContainer) postsContainer.prepend(postArticle);
  }
  
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
  
  function addComment(container, text) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.innerHTML = `
      <img src="${storedProfileImage}" alt="Commenter">
      <p class="comment-text">${text}</p>
    `;
    container.appendChild(commentDiv);
  }
  
  // Optional: Search functionality code (if implemented)
});
