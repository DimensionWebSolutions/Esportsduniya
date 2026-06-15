import { useState, useEffect } from 'react';
import '../styles/blog.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const CATEGORIES = ['all', 'cricket', 'football', 'nba', 'tennis', 'f1', 'general'];

const CATEGORY_ICONS = {
  cricket: '🏏', football: '⚽', nba: '🏀', tennis: '🎾', f1: '🏎️', general: '📰', all: '🌐',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function ArticleDetail({ slug, onBack }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/blog/${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); } else { setArticle(data); }
      })
      .catch(() => setError('Failed to load article.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="blog-article-page">
      <div className="blog-loading">
        <div className="blog-loading-spinner" />
        <p>Loading article…</p>
      </div>
    </div>
  );

  if (error || !article) return (
    <div className="blog-article-page">
      <div className="blog-empty">
        <div className="blog-empty-icon">😕</div>
        <p>{error || 'Article not found.'}</p>
        <button className="blog-article-back" onClick={onBack} style={{ marginTop: '1.5rem' }}>
          ← Back to Blog
        </button>
      </div>
    </div>
  );

  return (
    <div className="blog-article-page">
      <button className="blog-article-back" onClick={onBack}>← Back to Blog</button>
      <div className="blog-article-category">{CATEGORY_ICONS[article.category] || '📰'} {article.category}</div>
      <h1 className="blog-article-title">{article.title}</h1>
      <div className="blog-article-meta">
        <strong>Esportsduniya</strong>
        <span className="dot">·</span>
        <span>{formatDate(article.publishedAt)}</span>
        <span className="dot">·</span>
        <span>{article.readTime || 5} min read</span>
        <span className="dot">·</span>
        <span>{(article.wordCount || 0).toLocaleString()} words</span>
      </div>

      <div
        className="blog-article-content"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />

      <div className="blog-cta-box" style={{ marginTop: '2.5rem' }}>
        <h3>Follow Live Scores on Esportsduniya</h3>
        <p>Get real-time scores, AI predictions, and fan insights — all in one place</p>
        <a
          className="blog-cta-btn"
          href="https://www.esportsduniya.in/#dashboard"
          onClick={e => { e.preventDefault(); window.esportsNavigate?.('dashboard'); }}
        >
          Watch Live Scores →
        </a>
      </div>

      {(article.keywords || []).length > 0 && (
        <div className="blog-keywords">
          {article.keywords.map(k => (
            <span key={k} className="blog-keyword-tag">{k}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BlogIndex() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedSlug, setSelectedSlug] = useState(null);

  useEffect(() => {
    const cat = activeCategory === 'all' ? '' : `?category=${activeCategory}`;
    setLoading(true);
    fetch(`${API_BASE}/api/blog${cat}`)
      .then(r => r.json())
      .then(data => setArticles(Array.isArray(data) ? data : []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  if (selectedSlug) {
    return <ArticleDetail slug={selectedSlug} onBack={() => setSelectedSlug(null)} />;
  }

  return (
    <div className="blog-page">
      <div className="blog-page-header">
        <h1>Sports Blog</h1>
        <p>AI-powered news, match previews, and analysis — updated daily</p>
      </div>

      <div className="blog-filter-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`blog-filter-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {CATEGORY_ICONS[cat]} {cat === 'all' ? 'All Sports' : cat.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="blog-loading">
          <div className="blog-loading-spinner" />
          <p>Loading articles…</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="blog-empty">
          <div className="blog-empty-icon">📭</div>
          <p>No articles yet — check back soon!</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.5 }}>
            Articles are auto-generated every 6 hours.
          </p>
        </div>
      ) : (
        <div className="blog-grid">
          {articles.map(a => (
            <button
              key={a.slug}
              className="blog-card"
              onClick={() => setSelectedSlug(a.slug)}
              style={{ textAlign: 'left', width: '100%', font: 'inherit', cursor: 'pointer' }}
            >
              <div className="blog-card-category">
                {CATEGORY_ICONS[a.category] || '📰'} {a.category}
              </div>
              <div className="blog-card-title">{a.title}</div>
              <div className="blog-card-desc">{a.metaDescription}</div>
              <div className="blog-card-meta">
                <span>{formatDate(a.publishedAt)}</span>
                <span>{a.readTime || 5} min read</span>
                <span>{(a.wordCount || 0).toLocaleString()} words</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
