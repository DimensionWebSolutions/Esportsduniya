import { useState, useEffect } from 'react';
import { apiUrl } from '@/config/apiBase';
import '../styles/blog.css';

const CATEGORIES = ['all', 'cricket', 'football', 'nba', 'tennis', 'f1', 'general'];

const CATEGORY_ICONS = {
  cricket: '🏏', football: '⚽', nba: '🏀', tennis: '🎾', f1: '🏎️', general: '📰', all: '🌐',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function ArticleDetail({ article, onBack }) {
  if (!article) return null;

  if (article.isExternal && article.sourceUrl) {
    return (
      <div className="blog-article-page">
        <button className="blog-article-back" onClick={onBack}>← Back to News</button>
        <div className="blog-article-category">{CATEGORY_ICONS[article.category] || '📰'} {article.category}</div>
        <h1 className="blog-article-title">{article.title}</h1>
        <div className="blog-article-meta">
          {article.sourceName && <strong>{article.sourceName}</strong>}
          {article.sourceName && <span className="dot">·</span>}
          <span>{formatDate(article.publishedAt)}</span>
        </div>
        {article.imageUrl && (
          <img src={article.imageUrl} alt="" className="blog-article-hero-img" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 12, margin: '1.5rem 0' }} />
        )}
        <div
          className="blog-article-content"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />
        <div className="blog-cta-box" style={{ marginTop: '2rem' }}>
          <h3>Read the full story</h3>
          <p>This headline is from {article.sourceName || 'the publisher'}.</p>
          <a
            className="blog-cta-btn"
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open article →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-article-page">
      <button className="blog-article-back" onClick={onBack}>← Back to News</button>
      <div className="blog-article-category">{CATEGORY_ICONS[article.category] || '📰'} {article.category}</div>
      <h1 className="blog-article-title">{article.title}</h1>
      <div className="blog-article-meta">
        <strong>Esportsduniya</strong>
        <span className="dot">·</span>
        <span>{formatDate(article.publishedAt)}</span>
        <span className="dot">·</span>
        <span>{article.readTime || 5} min read</span>
      </div>
      <div
        className="blog-article-content"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />
      <div className="blog-cta-box" style={{ marginTop: '2.5rem' }}>
        <h3>Follow Live Scores on Esportsduniya</h3>
        <p>Get real-time scores, AI predictions, and fan insights — all in one place</p>
        <a className="blog-cta-btn" href="/">Watch Live Scores →</a>
      </div>
    </div>
  );
}

export default function BlogIndex() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    const cat = activeCategory === 'all' ? '' : `?category=${activeCategory}`;
    setLoading(true);
    fetch(apiUrl(`/api/blog${cat}`))
      .then(r => r.json())
      .then(data => setArticles(Array.isArray(data) ? data : []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const openArticle = (article) => {
    if (article.isExternal && article.sourceUrl) {
      window.open(article.sourceUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    fetch(apiUrl(`/api/blog/${encodeURIComponent(article.slug)}`))
      .then(r => r.json())
      .then(data => {
        if (!data.error) setSelectedArticle(data);
      })
      .catch(() => {});
  };

  if (selectedArticle) {
    return <ArticleDetail article={selectedArticle} onBack={() => setSelectedArticle(null)} />;
  }

  return (
    <div className="blog-page">
      <div className="blog-page-header">
        <h1>Sports News</h1>
        <p>Latest headlines from cricket, football, NBA, tennis, F1, and more — updated throughout the day</p>
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
          <p>Loading headlines…</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="blog-empty">
          <div className="blog-empty-icon">📭</div>
          <p>No headlines yet — check back soon!</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.5 }}>
            Headlines refresh automatically every 30 minutes.
          </p>
        </div>
      ) : (
        <div className="blog-grid">
          {articles.map(a => (
            <button
              key={a.slug}
              className="blog-card"
              onClick={() => openArticle(a)}
              style={{ textAlign: 'left', width: '100%', font: 'inherit', cursor: 'pointer' }}
            >
              {a.imageUrl && (
                <img
                  src={a.imageUrl}
                  alt=""
                  style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }}
                  loading="lazy"
                />
              )}
              <div className="blog-card-category">
                {CATEGORY_ICONS[a.category] || '📰'} {a.category}
                {a.sourceName && (
                  <span style={{ marginLeft: 8, opacity: 0.7 }}>· {a.sourceName}</span>
                )}
              </div>
              <div className="blog-card-title">{a.title}</div>
              <div className="blog-card-desc">{a.metaDescription}</div>
              <div className="blog-card-meta">
                <span>{formatDate(a.publishedAt)}</span>
                {a.isExternal && <span>External</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
