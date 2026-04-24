/**
 * build-movies.js — Fetch movie metadata from OMDB API
 * Reads movies.txt, fetches data, caches results, outputs movies.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

const MOVIES_FILE = path.join(__dirname, 'movies.txt');
const SRC_DIR = path.join(__dirname, 'src');
const CACHE_FILE = path.join(SRC_DIR, 'movies-cache.json');
const OUTPUT_FILE = path.join(SRC_DIR, 'movies.json');
const API_KEY = process.env.OMDB_API_KEY;

if (!API_KEY || API_KEY === 'your_key_here') {
  console.error('✗ OMDB_API_KEY not set in .env — skipping movie build.');
  console.error('  Get a free key at https://www.omdbapi.com/apikey.aspx');
  process.exit(0);
}

// ---- Read movies.txt ----
function readMoviesList() {
  if (!fs.existsSync(MOVIES_FILE)) {
    console.warn('⚠ movies.txt not found — creating empty one.');
    fs.writeFileSync(MOVIES_FILE, '# Add one movie title per line\n', 'utf-8');
    return [];
  }

  return fs.readFileSync(MOVIES_FILE, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

// ---- Load cache ----
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

// ---- OMDB API fetch ----
function fetchMovie(title) {
  return new Promise((resolve, reject) => {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${API_KEY}&plot=full`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.Response === 'False') {
            reject(new Error(`OMDB: ${json.Error} (title: "${title}")`));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(`Failed to parse OMDB response for "${title}"`));
        }
      });
    }).on('error', reject);
  });
}

// ---- Extract relevant fields ----
function extractMovieData(omdb) {
  return {
    title: omdb.Title || '',
    year: omdb.Year || '',
    rated: omdb.Rated || 'N/A',
    runtime: omdb.Runtime || '',
    genre: omdb.Genre || '',
    director: omdb.Director || '',
    actors: omdb.Actors || '',
    plot: omdb.Plot || '',
    poster: omdb.Poster && omdb.Poster !== 'N/A' ? omdb.Poster : '',
    imdbRating: omdb.imdbRating || 'N/A',
    imdbID: omdb.imdbID || '',
    language: omdb.Language || '',
    country: omdb.Country || '',
    awards: omdb.Awards || '',
  };
}

// ---- Main ----
async function build() {
  const titles = readMoviesList();

  if (titles.length === 0) {
    console.log('⚠ No movies in movies.txt — writing empty movies.json');
    fs.writeFileSync(OUTPUT_FILE, '[]', 'utf-8');
    return;
  }

  const cache = loadCache();
  const movies = [];
  let fetched = 0;
  let cached = 0;

  for (const title of titles) {
    const cacheKey = title.toLowerCase().trim();

    if (cache[cacheKey]) {
      movies.push(cache[cacheKey]);
      cached++;
      console.log(`  ⟳ ${title} (cached)`);
      continue;
    }

    try {
      console.log(`  ↓ Fetching: ${title}...`);
      const omdb = await fetchMovie(title);
      const movieData = extractMovieData(omdb);
      cache[cacheKey] = movieData;
      movies.push(movieData);
      fetched++;

      // Small delay to be nice to the API
      await new Promise(r => setTimeout(r, 250));
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
    }
  }

  // Save cache and output
  saveCache(cache);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(movies, null, 2), 'utf-8');

  console.log(`\n✓ Built ${movies.length} movies → src/movies.json`);
  console.log(`  ${fetched} fetched, ${cached} from cache`);
  movies.forEach(m => console.log(`  • ${m.title} (${m.year}) — ★ ${m.imdbRating}`));
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
