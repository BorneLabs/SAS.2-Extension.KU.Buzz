import { parseTimestamp, formatLiveTime } from "./time-utils.js";
import supabase from "./supabase-config.js";

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user ? user.id : null;
  if (!userId) {
    window.location.href = "index.html";
    return;
  }
  const { data: userRecord } = await supabase
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
  const profileBtnImg = document.querySelector('.profile-btn img');
  if (profileBtnImg) {
    const currentProfileImage = currentUser.profile_image || "Assets/Images/default-logo.jpg";
    profileBtnImg.src = currentProfileImage + '?v=' + new Date().getTime();
  }
  let postLimit = 10;
  let postOffset = 0;
  let allPostsLoaded = false;
  let isPosting = false;
  const postsContainer = document.getElementById('postsContainer');
  const floatingPostBtn = document.getElementById('floatingPostBtn');
  const newPostPopup = document.getElementById('newPostPopup');
  const popupCloseBtn = document.getElementById('popupCloseBtn');
  const popupPostText = document.getElementById('popupPostText');
  const popupImageUpload = document.getElementById('popupImageUpload');
  const popupImagePreview = document.getElementById('popupImagePreview');
  const popupPostBtn = document.getElementById('popupPostBtn');
  const charCount = document.getElementById('charCount');
  let popupCurrentImage = null;
  popupPostText.addEventListener('input', () => {
    const length = popupPostText.value.length;
    charCount.textContent = `${length}/750`;
  });
  if (floatingPostBtn) {
    floatingPostBtn.addEventListener('click', () => {
      newPostPopup.style.display = 'block';
    });
  }
  function closePopup() {
    popupPostText.value = '';
    charCount.textContent = '0/750';
    if (popupImagePreview) {
      popupImagePreview.innerHTML = '';
      popupImagePreview.style.display = 'none';
    }
    popupCurrentImage = null;
    newPostPopup.style.display = 'none';
    popupPostBtn.disabled = false;
    isPosting = false;
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
  async function handlePostSubmission() {
    if (isPosting) return;
    isPosting = true;
    popupPostBtn.disabled = true;
    await createPost(popupPostText.value.trim(), popupCurrentImage);
    closePopup();
  }
  if (popupPostBtn) {
    popupPostBtn.addEventListener('click', handlePostSubmission);
  }
  if (popupPostText) {
    popupPostText.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        await handlePostSubmission();
      }
    });
  }
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
  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
  setInterval(() => {
    document.querySelectorAll(".post-time").forEach(elem => {
      const t = elem.getAttribute("data-time");
      elem.textContent = formatLiveTime(t);
    });
    document.querySelectorAll(".comment-time").forEach(elem => {
      const t = elem.getAttribute("data-time");
      elem.textContent = formatLiveTime(t);
    });
  }, 60000);
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
    const localTime = new Date().toISOString();
    const { data, error } = await supabase
      .from('Posts')
      .insert([{ content, image_url: imageUrl, user_id: userId }])
      .select('*')
      .single();
    if (error || !data) {
      console.error("Error saving post:", error ? error.message : "No data returned");
      return;
    }
    const newPostData = { 
      ...data, 
      created_at: localTime, 
      Users: data.Users ? data.Users : currentUser 
    };
    const newPostElement = createPostElement(newPostData);
    postsContainer.prepend(newPostElement);
  }
  async function fetchPosts() {
    if (allPostsLoaded) return;
    const { data, error } = await supabase
      .from('Posts')
      .select(`id, content, image_url, created_at, user_id, Users (username, profile_image)`)
      .order('created_at', { ascending: false })
      .range(postOffset, postOffset + postLimit - 1);
    if (error) {
      console.error("Error fetching posts:", error.message);
      return;
    }
    if (data.length < postLimit) {
      allPostsLoaded = true;
    }
    postOffset += data.length;
    data.forEach(post => {
      const postElement = createPostElement(post);
      postElement.dataset.commentsOffset = "0";
      postElement.dataset.commentsLimit = "3";
      postsContainer.appendChild(postElement);
    });
  }
  postsContainer.addEventListener('scroll', () => {
    if (postsContainer.scrollTop + postsContainer.clientHeight >= postsContainer.scrollHeight - 100) {
      fetchPosts();
    }
  });
  async function fetchComments(postId, postElement, append = false) {
    const commentsOffset = parseInt(postElement.dataset.commentsOffset);
    const commentsLimit = parseInt(postElement.dataset.commentsLimit);
    const { data, error } = await supabase
      .from('Comments')
      .select(`id, comment_text, created_at, user_id, Users (username, profile_image)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(commentsOffset, commentsOffset + commentsLimit - 1);
    if (error) {
      console.error("Error fetching comments:", error.message);
      return;
    }
    const commentsContainer = postElement.querySelector('.comments-container');
    if (!append) {
      commentsContainer.innerHTML = "";
    }
    data.forEach(comment => {
      addCommentToDOM(comment, commentsContainer);
    });
    postElement.dataset.commentsOffset = (commentsOffset + data.length).toString();
    if (data.length === commentsLimit) {
      if (!postElement.querySelector('.load-more-comments-btn')) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'load-more-comments-btn';
        loadMoreBtn.textContent = "Load More Comments";
        loadMoreBtn.addEventListener('click', () => fetchComments(postId, postElement, true));
        postElement.querySelector('.comments-section').appendChild(loadMoreBtn);
      }
    } else {
      const loadMoreBtn = postElement.querySelector('.load-more-comments-btn');
      if (loadMoreBtn) loadMoreBtn.remove();
    }
  }
  function createPostElement(post) {
    const postArticle = document.createElement('article');
    postArticle.className = 'post';
    postArticle.setAttribute('data-post-id', post.id);
    const postUser = post.Users || currentUser;
    const userProfileImage = postUser.profile_image || "Assets/Images/default-logo.jpg";
    const username = postUser.username || "Unknown User";
    const formattedTime = formatLiveTime(post.created_at);
    const optionsButton = (post.user_id === userId) 
      ? `<div class="post-options-container"><button class="post-options">▼</button></div>`
      : '';
    postArticle.innerHTML = `
      <div class="post-author">
        <img src="${userProfileImage}" alt="Author">
        <span class="post-username">@${username}</span>
        <span class="post-time" data-time="${post.created_at}">${formattedTime}</span>
        ${optionsButton}
      </div>
      <div class="post-content">
        ${post.content ? `<p>${post.content}</p>` : ''}
        ${post.image_url ? `<img src="${post.image_url}" alt="Post Image">` : ''}
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
    if (post.user_id === userId) {
      const optionsBtn = postArticle.querySelector('.post-options');
      optionsBtn.addEventListener('click', () => openPostOptionsPopup(post, postArticle));
    }
    return postArticle;
  }
  function setupPostInteractions(postElement, postId) {
    const toggleBtn = postElement.querySelector('.toggle-comments-btn');
    const commentsSection = postElement.querySelector('.comments-section');
    if (toggleBtn && commentsSection) {
      toggleBtn.addEventListener('click', () => {
        if (commentsSection.style.display === 'none' || commentsSection.style.display === '') {
          commentsSection.style.display = 'block';
          toggleBtn.textContent = 'Hide Comments';
          if (postElement.dataset.commentsOffset === "0") {
            fetchComments(postId, postElement);
          }
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
  async function createComment(postId, commentText, commentsContainer) {
    const localTime = new Date().toISOString();
    const { data, error } = await supabase
      .from('Comments')
      .insert([{ post_id: postId, user_id: userId, comment_text: commentText }])
      .select()
      .single();
    if (error) {
      console.error("Error saving comment:", error.message);
      return;
    }
    const commentForDisplay = { ...data, created_at: localTime, Users: data.Users ? data.Users : currentUser };
    addCommentToDOM(commentForDisplay, commentsContainer);
    const commentsSection = commentsContainer.parentElement;
    if (!commentsSection || commentsSection.style.display === 'none') {
      commentsSection.style.display = 'block';
      const toggleBtn = commentsSection.parentElement.querySelector('.toggle-comments-btn');
      if (toggleBtn) {
        toggleBtn.textContent = 'Hide Comments';
      }
    }
  }
  function addCommentToDOM(comment, container) {
    const commenterImage = comment.Users?.profile_image || currentUser.profile_image || "Assets/Images/default-logo.jpg";
    const commenterUsername = comment.Users?.username || currentUser.username || "Unknown User";
    const formattedTime = formatLiveTime(comment.created_at);
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.innerHTML = `
      <img src="${commenterImage}" alt="Commenter">
      <div class="comment-body">
        <div class="comment-header">
          <span class="comment-username">@${commenterUsername}</span>
          <span class="comment-time" data-time="${comment.created_at}">${formattedTime}</span>
        </div>
        <div class="comment-text">${comment.comment_text}</div>
      </div>
    `;
    container.insertBefore(commentDiv, container.firstChild);
  }
  function openPostOptionsPopup(post, postElement) {
    const overlay = document.createElement('div');
    overlay.className = 'post-options-popup';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '2000';
    const confirmMessageHTML = `<p class="delete-confirmation" style="display:none; margin-top:10px; color: red;">Are you sure you want to delete this post?</p>`;
    overlay.innerHTML = `
      <div class="popup-content" style="background: #333; padding: 20px; border-radius: 8px; width: 90%; max-width: 400px;">
        <textarea id="popupEditText" style="width: 100%; height: 100px; margin-bottom: 10px;">${post.content}</textarea>
        <div style="display: flex; justify-content: space-between;">
          <button id="editPostBtn">Edit</button>
          <button id="deletePostBtn">Delete</button>
        </div>
        ${confirmMessageHTML}
      </div>
    `;
    document.body.appendChild(overlay);
    let deleteConfirmed = false;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    overlay.querySelector('#editPostBtn').addEventListener('click', async () => {
      const newContent = overlay.querySelector('#popupEditText').value.trim();
      if (newContent === "") {
        alert("Post content cannot be empty.");
        return;
      }
      const { error } = await supabase
        .from('Posts')
        .update({ content: newContent })
        .eq('id', post.id);
      if (error) {
        alert("Error updating post: " + error.message);
        return;
      }
      const contentElem = postElement.querySelector('.post-content p');
      if (contentElem) {
        contentElem.textContent = newContent;
      }
      document.body.removeChild(overlay);
    });
    const deleteBtn = overlay.querySelector('#deletePostBtn');
    const confirmMsg = overlay.querySelector('.delete-confirmation');
    deleteBtn.addEventListener('click', async () => {
      if (!deleteConfirmed) {
        confirmMsg.style.display = 'block';
        deleteBtn.classList.add('confirm-delete');
        deleteConfirmed = true;
      } else {
        await supabase.from('Comments').delete().eq('post_id', post.id);
        const { error } = await supabase.from('Posts').delete().eq('id', post.id);
        if (error) {
          alert("Error deleting post: " + error.message);
          return;
        }
        if (post.image_url) {
          const segments = post.image_url.split('/');
          const fileName = segments.pop().split('?')[0];
          const { error: removeError } = await supabase.storage.from('post-images').remove([fileName]);
          if (removeError) {
            console.error("Error removing post image:", removeError.message);
          }
        }
        postElement.remove();
        document.body.removeChild(overlay);
      }
    });
  }
  fetchPosts();
});
