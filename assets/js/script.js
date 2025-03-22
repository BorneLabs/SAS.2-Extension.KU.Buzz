document.addEventListener('DOMContentLoaded', () => {
  const postsContainer = document.getElementById('postsContainer');
  const floatingPostBtn = document.getElementById('floatingPostBtn');
  const newPostPopup = document.getElementById('newPostPopup');
  const popupCloseBtn = document.getElementById('popupCloseBtn');
  const popupPostText = document.getElementById('popupPostText');
  const popupImageUpload = document.getElementById('popupImageUpload');
  const popupImagePreview = document.getElementById('popupImagePreview');
  const popupPostBtn = document.getElementById('popupPostBtn');
  let popupCurrentImage = null;
  floatingPostBtn.addEventListener('click', () => {
    newPostPopup.style.display = 'block';
  });
  popupCloseBtn.addEventListener('click', closePopup);
  popupImageUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        popupImagePreview.style.display = 'block';
        popupImagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        popupCurrentImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
  popupPostBtn.addEventListener('click', () => {
    createPost(popupPostText.value.trim(), popupCurrentImage);
    closePopup();
  });
  popupPostText.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      createPost(popupPostText.value.trim(), popupCurrentImage);
      closePopup();
    }
  });
  function closePopup() {
    popupPostText.value = '';
    popupImagePreview.innerHTML = '';
    popupImagePreview.style.display = 'none';
    popupCurrentImage = null;
    newPostPopup.style.display = 'none';
    popupImageUpload.value = '';
  }
  function createPost(text, image) {
    if (!text && !image) return;
    const postArticle = document.createElement('article');
    postArticle.className = 'post';
    const markup = `
      <div class="post-content">
        ${image ? `<img src="${image}" alt="Post Image">` : ''}
        ${text ? `<p>${text}</p>` : ''}
      </div>
      <div class="post-author">
        <img src="https://via.placeholder.com/32" alt="Author">
        <span>@KU_User</span>
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
    postArticle.innerHTML = markup;
    setupPostInteractions(postArticle);
    postsContainer.prepend(postArticle);
  }
  function setupPostInteractions(postElement) {
    const toggleBtn = postElement.querySelector('.toggle-comments-btn');
    const commentsSection = postElement.querySelector('.comments-section');
    toggleBtn.addEventListener('click', () => {
      if (commentsSection.style.display === 'none' || commentsSection.style.display === '') {
        commentsSection.style.display = 'block';
        toggleBtn.textContent = 'Hide Comments';
      } else {
        commentsSection.style.display = 'none';
        toggleBtn.textContent = 'Show Comments';
      }
    });
    const commentBtn = postElement.querySelector('.comment-btn');
    const commentTextarea = postElement.querySelector('.comment-input textarea');
    const commentsContainer = postElement.querySelector('.comments-container');
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
  function addComment(container, text) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.innerHTML = `
      <img src="https://via.placeholder.com/30" alt="Commenter">
      <p class="comment-text">${text}</p>
    `;
    container.appendChild(commentDiv);
  }
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  const searchContainer = document.getElementById('searchContainer');
  const postsHeader = document.querySelector('.posts-header');
  searchBtn.addEventListener('click', () => {
    searchContainer.classList.toggle('active');
    postsHeader.classList.toggle('active');
    if (searchContainer.classList.contains('active')) {
      searchInput.focus();
    } else {
      searchInput.value = '';
      filterPosts('');
    }
  });
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    filterPosts(query);
  });
  function filterPosts(query) {
    const posts = document.querySelectorAll('.post');
    posts.forEach(post => {
      const username = post.querySelector('.post-author span').textContent.toLowerCase();
      post.style.display = username.includes(query) ? 'block' : 'none';
    });
  }
});
