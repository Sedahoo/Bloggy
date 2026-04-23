/**
 * App.js — Blog listing page logic
 * Fetches posts.json, renders cards directly, scroll reveal
 */
(function () {

  // ---- Fetch & Render ----
  async function loadPosts() {
    showSkeleton();

    try {
      const response = await fetch('./posts.json');
      if (!response.ok) throw new Error('Failed to load posts');
      const posts = await response.json();
      renderPosts(posts);
      initScrollReveal();
    } catch (err) {
      console.error('Error loading posts:', err);
      showEmptyState('Could not load posts. Run `npm run build` first.');
    }
  }

  function renderPosts(posts) {
    const grid = document.getElementById('posts-grid');
    if (!grid) return;

    if (posts.length === 0) {
      showEmptyState('No posts yet. Start writing in blogs/writing/');
      return;
    }

    grid.innerHTML = posts.map(post => createPostCard(post)).join('');
    initScrollReveal();
  }

  function createPostCard(post) {
    const dateStr = formatDate(post.date);

    return `
      <a href="post.html?slug=${post.slug}" class="post-card reveal" id="post-${post.slug}">
        <div class="post-card-top">
          <span class="post-card-date">${dateStr}</span>
          <span class="post-card-dot"></span>
          <span class="post-card-reading-time">${post.readingTime} min read</span>
        </div>
        <h2 class="post-card-title">${escapeHtml(post.title)}</h2>
        ${post.description ? `<p class="post-card-description">${escapeHtml(post.description)}</p>` : ''}
        <span class="post-card-arrow">→</span>
      </a>
    `;
  }

  // ---- Skeleton Loading ----
  function showSkeleton() {
    const grid = document.getElementById('posts-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="loading-skeleton skeleton-card"></div>
      <div class="loading-skeleton skeleton-card"></div>
      <div class="loading-skeleton skeleton-card"></div>
    `;
  }

  // ---- Empty State ----
  function showEmptyState(message) {
    const grid = document.getElementById('posts-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✍️</div>
        <p class="empty-state-text">${message}</p>
      </div>
    `;
  }

  // ---- Scroll Reveal ----
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal:not(.revealed)');

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      reveals.forEach(el => observer.observe(el));
    } else {
      reveals.forEach(el => el.classList.add('revealed'));
    }
  }

  // ---- Utilities ----
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Init ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPosts);
  } else {
    loadPosts();
  }
})();
