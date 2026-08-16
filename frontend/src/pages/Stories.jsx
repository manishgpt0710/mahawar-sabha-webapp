import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, MessageCircle, ShareIcon, Tag } from "lucide-react";
import { buildWhatsAppShareUrl, storiesApi } from "@/lib/storiesApi";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function StoryCover({ story }) {
  const src = story.coverUrl || (story.coverAssetId ? storiesApi.coverUrl(story.slug) : "");
  if (!src) {
    return (
      <div className="story-cover story-cover--fallback" aria-hidden>
        <span>ॐ</span>
      </div>
    );
  }
  return (
    <div className="story-cover">
      <img src={src} alt={story.title} loading="lazy" />
    </div>
  );
}

function whatsappHref(story) {
  const url = `${window.location.origin}/stories/${story.slug}`;
  return buildWhatsAppShareUrl({ title: story.title, excerpt: story.excerpt, url });
}

export function StoriesList() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    storiesApi
      .list("mathura")
      .then((body) => {
        if (alive) setStories(body.stories || []);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="stories-page">
      <section className="stories-hero">
        <div className="section-label">03 — Heritage journal</div>
        <h1>Stories that carry our community forward.</h1>
        <p>
          Short heritage notes and community reflections from Mahawar Sabha — Mathura. Share the
          ones that move you with your family on WhatsApp.
        </p>
      </section>

      {loading && (
        <div className="stories-empty" data-testid="stories-loading">
          Loading stories...
        </div>
      )}
      {error && !loading && (
        <div className="stories-empty" data-testid="stories-error">
          Could not load stories: {error}
        </div>
      )}
      {!loading && !error && stories.length === 0 && (
        <div className="stories-empty" data-testid="stories-empty">
          No stories published yet. Check back soon.
        </div>
      )}

      <ul className="stories-grid" data-testid="stories-grid">
        {stories.map((story) => (
          <li key={story.id} className="story-card" data-testid={`story-card-${story.slug}`}>
            <Link to={`/stories/${story.slug}`} className="story-card-link">
              <StoryCover story={story} />
              <div className="story-card-body">
                {story.tags?.length > 0 && (
                  <span className="story-tag">
                    <Tag size={12} /> {story.tags[0]}
                  </span>
                )}
                <h2>{story.title}</h2>
                {story.subtitle && <p className="story-subtitle">{story.subtitle}</p>}
                <p className="story-excerpt">{story.excerpt}</p>
                <div className="story-meta">
                  <span>
                    <Calendar size={13} /> {formatDate(story.publishedAt || story.createdAt)}
                  </span>
                  <span>{story.author}</span>
                </div>
              </div>
            </Link>
            <a
              href={whatsappHref(story)}
              target="_blank"
              rel="noreferrer"
              className="story-share-mini"
              data-testid={`story-share-mini-${story.slug}`}
              aria-label={`Share ${story.title} on WhatsApp`}
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle size={14} /> Share
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}

export function StoryDetail() {
  const { slug } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    storiesApi
      .get(slug)
      .then((body) => {
        if (alive) setStory(body.story);
      })
      .catch((e) => alive && setError(e.message || "Not found"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="stories-page">
        <div className="stories-empty" data-testid="story-loading">
          Loading...
        </div>
      </main>
    );
  }
  if (error || !story) {
    return (
      <main className="stories-page">
        <div className="stories-empty" data-testid="story-error">
          {error || "Story not found"}
        </div>
        <Link to="/stories" className="under-link" data-testid="story-back-link">
          <ArrowLeft size={16} /> Back to journal
        </Link>
      </main>
    );
  }

  const shareUrl = whatsappHref(story);
  const paragraphs = story.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <main className="story-detail-page">
      <article className="story-detail">
        <Link to="/stories" className="story-back" data-testid="story-back-link">
          <ArrowLeft size={16} /> Journal
        </Link>
        <span className="section-label">Heritage story</span>
        <h1 data-testid="story-title">{story.title}</h1>
        {story.subtitle && <p className="story-subtitle-lg">{story.subtitle}</p>}
        <div className="story-meta">
          <span>
            <Calendar size={13} /> {formatDate(story.publishedAt || story.createdAt)}
          </span>
          <span>By {story.author}</span>
          {story.tags?.length > 0 && (
            <span>
              <Tag size={13} /> {story.tags.join(", ")}
            </span>
          )}
        </div>
        <StoryCover story={story} />
        <div className="story-body" data-testid="story-body">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="story-share">
          <div>
            <ShareIcon size={18} />
            <div>
              <strong>Share this story</strong>
              <small>Send it to your family on WhatsApp with one tap.</small>
            </div>
          </div>
          <a
            className="whatsapp-button"
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            data-testid="story-share-whatsapp"
          >
            <MessageCircle size={16} /> Share on WhatsApp
          </a>
        </div>

        <Link to="/stories" className="under-link" data-testid="story-more-link">
          More stories <ArrowRight size={16} />
        </Link>
      </article>
    </main>
  );
}
