const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const BLOGS_DIR = path.join(__dirname, 'blogs', 'writing');
const SRC_DIR = path.join(__dirname, 'src');
const POSTS_OUT_DIR = path.join(SRC_DIR, 'posts');

// Ensure output directories exist
if (!fs.existsSync(POSTS_OUT_DIR)) {
  fs.mkdirSync(POSTS_OUT_DIR, { recursive: true });
}

// Read all markdown files from blogs/writing/
const files = fs.readdirSync(BLOGS_DIR).filter(f => f.endsWith('.md'));

const posts = files.map(file => {
  const raw = fs.readFileSync(path.join(BLOGS_DIR, file), 'utf-8');
  const { data, content } = matter(raw);

  const slug = file.replace(/\.md$/, '');

  // Calculate reading time (~200 words per minute)
  const wordCount = content.trim().split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Copy the markdown file to src/posts/ for client-side fetching
  fs.writeFileSync(path.join(POSTS_OUT_DIR, file), raw, 'utf-8');

  return {
    slug,
    title: data.title || slug,
    date: data.date || new Date().toISOString().split('T')[0],
    tags: data.tags || [],
    description: data.description || '',
    cover: data.cover || '',
    readingTime,
  };
});

// Sort by date (newest first)
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Write posts index
fs.writeFileSync(
  path.join(SRC_DIR, 'posts.json'),
  JSON.stringify(posts, null, 2),
  'utf-8'
);

console.log(`✓ Built ${posts.length} posts → src/posts.json`);
posts.forEach(p => console.log(`  • ${p.title} (${p.readingTime} min read)`));
