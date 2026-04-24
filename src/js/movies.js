/**
 * Movies.js — Movie listing page logic
 * Fetches movies.json, renders poster cards, modal details, scroll reveal
 */
(function () {

  // ---- Fetch & Render ----
  async function loadMovies() {
    showSkeleton();

    try {
      const response = await fetch('./movies.json');
      if (!response.ok) throw new Error('Failed to load movies');
      const movies = await response.json();
      renderMovies(movies);
    } catch (err) {
      console.error('Error loading movies:', err);
      showEmptyState('Could not load movies. Run <code>npm run build</code> first.');
    }
  }

  function renderMovies(movies) {
    const grid = document.getElementById('movies-grid');
    if (!grid) return;

    if (movies.length === 0) {
      showEmptyState('No movies yet. Add titles to movies.txt and rebuild.');
      return;
    }

    grid.innerHTML = movies.map((movie, i) => createMovieCard(movie, i)).join('');

    // Bind click events
    grid.querySelectorAll('.movie-card').forEach((card, i) => {
      card.addEventListener('click', () => openModal(movies[i]));
    });

    initScrollReveal();
  }

  function createMovieCard(movie, index) {
    const ratingColor = getRatingColor(parseFloat(movie.imdbRating));
    const posterBg = movie.poster
      ? `<img src="${movie.poster}" alt="${escapeHtml(movie.title)} poster" class="movie-card-poster" loading="lazy" />`
      : `<div class="movie-card-no-poster"><span>🎬</span></div>`;

    return `
      <div class="movie-card reveal" id="movie-${index}" tabindex="0" role="button" aria-label="View details for ${escapeHtml(movie.title)}">
        <div class="movie-card-poster-wrap">
          ${posterBg}
          <div class="movie-card-overlay">
            <div class="movie-card-overlay-content">
              <span class="movie-card-genre">${escapeHtml(movie.genre)}</span>
              <span class="movie-card-runtime">${escapeHtml(movie.runtime)}</span>
            </div>
          </div>
          ${movie.imdbRating !== 'N/A' ? `
            <div class="movie-card-rating" style="--rating-color: ${ratingColor}">
              <span class="movie-card-star">★</span>
              <span>${movie.imdbRating}</span>
            </div>
          ` : ''}
        </div>
        <div class="movie-card-info">
          <h3 class="movie-card-title">${escapeHtml(movie.title)}</h3>
          <span class="movie-card-year">${escapeHtml(movie.year)}</span>
        </div>
      </div>
    `;
  }

  // ---- Rating Color ----
  function getRatingColor(rating) {
    if (isNaN(rating)) return '#999';
    if (rating >= 8.0) return '#4CAF50';
    if (rating >= 7.0) return '#FFC107';
    if (rating >= 5.0) return '#FF9800';
    return '#F44336';
  }

  // ---- Modal ----
  function openModal(movie) {
    const overlay = document.getElementById('movie-modal-overlay');
    const content = document.getElementById('movie-modal-content');
    if (!overlay || !content) return;

    const ratingColor = getRatingColor(parseFloat(movie.imdbRating));

    content.innerHTML = `
      <div class="movie-modal-layout">
        <div class="movie-modal-poster">
          ${movie.poster
            ? `<img src="${movie.poster}" alt="${escapeHtml(movie.title)} poster" />`
            : `<div class="movie-modal-no-poster"><span>🎬</span></div>`
          }
        </div>
        <div class="movie-modal-details">
          <h2 class="movie-modal-title">${escapeHtml(movie.title)}</h2>

          <div class="movie-modal-meta">
            <span class="movie-modal-year">${escapeHtml(movie.year)}</span>
            <span class="movie-modal-dot">·</span>
            <span class="movie-modal-rated">${escapeHtml(movie.rated)}</span>
            <span class="movie-modal-dot">·</span>
            <span class="movie-modal-runtime">${escapeHtml(movie.runtime)}</span>
          </div>

          ${movie.imdbRating !== 'N/A' ? `
            <div class="movie-modal-rating" style="--rating-color: ${ratingColor}">
              <span class="movie-modal-star">★</span>
              <span class="movie-modal-rating-value">${movie.imdbRating}</span>
              <span class="movie-modal-rating-label">/ 10 IMDb</span>
            </div>
          ` : ''}

          <div class="movie-modal-genres">
            ${movie.genre.split(',').map(g => `<span class="movie-modal-genre-tag">${g.trim()}</span>`).join('')}
          </div>

          <p class="movie-modal-plot">${escapeHtml(movie.plot)}</p>

          <div class="movie-modal-credits">
            ${movie.director ? `
              <div class="movie-modal-credit">
                <span class="movie-modal-credit-label">Director</span>
                <span class="movie-modal-credit-value">${escapeHtml(movie.director)}</span>
              </div>
            ` : ''}
            ${movie.actors ? `
              <div class="movie-modal-credit">
                <span class="movie-modal-credit-label">Cast</span>
                <span class="movie-modal-credit-value">${escapeHtml(movie.actors)}</span>
              </div>
            ` : ''}
            ${movie.country ? `
              <div class="movie-modal-credit">
                <span class="movie-modal-credit-label">Country</span>
                <span class="movie-modal-credit-value">${escapeHtml(movie.country)}</span>
              </div>
            ` : ''}
          </div>

          ${movie.imdbID ? `
            <a href="https://www.imdb.com/title/${movie.imdbID}" target="_blank" rel="noopener" class="movie-modal-imdb-link" id="imdb-link-${movie.imdbID}">
              View on IMDb →
            </a>
          ` : ''}
        </div>
      </div>
    `;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus trap
    const closeBtn = document.getElementById('movie-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    const overlay = document.getElementById('movie-modal-overlay');
    if (!overlay) return;

    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ---- Modal Event Listeners ----
  function initModalListeners() {
    const overlay = document.getElementById('movie-modal-overlay');
    const closeBtn = document.getElementById('movie-modal-close');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ---- Skeleton Loading ----
  function showSkeleton() {
    const grid = document.getElementById('movies-grid');
    if (!grid) return;

    grid.innerHTML = Array(6).fill(
      '<div class="loading-skeleton movie-skeleton"></div>'
    ).join('');
  }

  // ---- Empty State ----
  function showEmptyState(message) {
    const grid = document.getElementById('movies-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="empty-state movies-empty">
        <div class="empty-state-icon">🎬</div>
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
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Init ----
  function init() {
    loadMovies();
    initModalListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
