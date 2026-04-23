/**
 * Post.js — Single post rendering
 * Reads slug from URL, fetches markdown, renders via marked.js
 */
(function () {
  // ---- Load marked.js from CDN ----
  function loadMarked() {
    return new Promise((resolve, reject) => {
      if (window.marked) return resolve(window.marked);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/marked@15.0.0/marked.min.js';
      script.onload = () => resolve(window.marked);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // ---- Parse frontmatter manually (gray-matter is Node-only) ----
  function parseFrontmatter(raw) {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { meta: {}, content: raw };

    const metaBlock = match[1];
    const content = match[2];
    const meta = {};

    metaBlock.split('\n').forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return;
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();

      // Parse arrays: [tag1, tag2]
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      }
      // Remove wrapping quotes
      else if ((val.startsWith('"') && val.endsWith('"')) ||
               (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }

      meta[key] = val;
    });

    return { meta, content };
  }

  // ---- Syntax highlighting (simple token-based) ----
  function highlightCode(code, lang) {
    // Simple keyword-based highlighting for common languages
    const keywords = {
      js: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|new|this|try|catch|throw|switch|case|break|continue|typeof|instanceof)\b/g,
      javascript: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|new|this|try|catch|throw|switch|case|break|continue|typeof|instanceof)\b/g,
      css: /\b(display|flex|grid|position|margin|padding|border|color|background|font|width|height|max-width|min-width|overflow|transition|transform|opacity|animation|none|auto|inherit|relative|absolute|fixed|sticky)\b/g,
      python: /\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|raise|with|yield|lambda|pass|break|continue|True|False|None|print|self|in|not|and|or|is)\b/g,
      markdown: null,
    };

    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Apply syntax highlighting
    const langKey = (lang || '').toLowerCase();

    // Strings
    escaped = escaped.replace(/(["'`])(?:(?!\1|\\).|\\.)*\1/g,
      m => `<span class="token-string">${m}</span>`);

    // Comments (// and /* */ and #)
    escaped = escaped.replace(/(\/\/.*$)/gm,
      m => `<span class="token-comment">${m}</span>`);
    escaped = escaped.replace(/(#.*$)/gm,
      m => `<span class="token-comment">${m}</span>`);

    // Numbers
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g,
      m => `<span class="token-number">${m}</span>`);

    // Keywords
    const kwRegex = keywords[langKey];
    if (kwRegex) {
      escaped = escaped.replace(kwRegex,
        m => `<span class="token-keyword">${m}</span>`);
    }

    return escaped;
  }

  // ---- Calculate reading time ----
  function calcReadingTime(text) {
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  // ---- Main ----
  async function loadPost() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (!slug) {
      showError('No post specified.');
      return;
    }

    try {
      // Fetch markdown
      const response = await fetch(`./posts/${slug}.md`);
      if (!response.ok) throw new Error('Post not found');
      const raw = await response.text();

      // Parse
      const { meta, content } = parseFrontmatter(raw);

      // Load marked
      const markedLib = await loadMarked();

      // Configure marked with custom renderer
      const renderer = new markedLib.Renderer();

      // Custom code block rendering with syntax highlighting
      renderer.code = function ({ text, lang }) {
        const language = lang || '';
        const highlighted = highlightCode(text, language);
        return `<pre data-lang="${language}"><code>${highlighted}</code></pre>`;
      };

      // Custom image rendering
      renderer.image = function ({ href, title, text }) {
        return `<figure>
          <img src="${href}" alt="${text || ''}" loading="lazy" />
          ${title ? `<figcaption>${title}</figcaption>` : ''}
        </figure>`;
      };

      markedLib.setOptions({ renderer, breaks: false, gfm: true });

      const html = markedLib.parse(content);
      const readingTime = calcReadingTime(content);

      // Render header
      const headerEl = document.getElementById('post-header-content');
      if (headerEl) {
        const dateStr = meta.date ? new Date(meta.date).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }) : '';

        headerEl.innerHTML = `
          <div class="post-meta">
            <span class="post-meta-item">${dateStr}</span>
            <span class="post-card-dot"></span>
            <span class="post-meta-item">${readingTime} min read</span>
          </div>
          <h1>${escapeHtml(meta.title || slug)}</h1>
          ${meta.description ? `<p class="post-header-description">${escapeHtml(meta.description)}</p>` : ''}
        `;
      }

      // Render content
      const proseEl = document.getElementById('post-content');
      if (proseEl) {
        proseEl.innerHTML = html;
      }

      // Update page title
      if (meta.title) {
        document.title = `${meta.title} — Bloggy`;
      }

      // Update meta description
      if (meta.description) {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', meta.description);
      }

    } catch (err) {
      console.error('Error loading post:', err);
      showError('Post not found. It may not have been built yet.');
    }
  }

  function showError(message) {
    const headerEl = document.getElementById('post-header-content');
    const proseEl = document.getElementById('post-content');

    if (headerEl) {
      headerEl.innerHTML = `<h1>Oops!</h1>`;
    }
    if (proseEl) {
      proseEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <p class="empty-state-text">${message}</p>
        </div>
      `;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Init ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPost);
  } else {
    loadPost();
  }
})();
