import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Eye,
  ImagePlus,
  Loader2,
  PenSquare,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { adminStoriesApi, storiesApi } from "@/lib/storiesApi";

const TOKEN_KEY = "mahawar_admin_token";

function useAdminToken() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
  }, []);
  return { token, clear };
}

const EMPTY = {
  title: "",
  subtitle: "",
  body: "",
  author: "Mahawar Sabha",
  tags: "",
  coverUrl: "",
  coverAssetId: "",
  published: false,
};

function toFormState(story) {
  if (!story) return EMPTY;
  return {
    title: story.title || "",
    subtitle: story.subtitle || "",
    body: story.body || "",
    author: story.author || "Mahawar Sabha",
    tags: (story.tags || []).join(", "),
    coverUrl: story.coverUrl || "",
    coverAssetId: story.coverAssetId || "",
    published: !!story.published,
  };
}

function fromFormState(form) {
  return {
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    body: form.body.trim(),
    author: form.author.trim() || "Mahawar Sabha",
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    coverUrl: form.coverUrl.trim(),
    coverAssetId: form.coverAssetId,
    published: form.published,
    location: "mathura",
  };
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function StoryEditor({ token, story, onCancel, onSaved }) {
  const [form, setForm] = useState(() => toFormState(story));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!story?.id;

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (publish) => {
    setError("");
    if (!form.title.trim() || !form.body.trim()) {
      setError("Title and body are required.");
      return;
    }
    setBusy(true);
    try {
      const payload = { ...fromFormState(form), published: publish };
      if (isEdit) {
        const { story: saved } = await adminStoriesApi.update(token, story.id, payload);
        onSaved(saved);
      } else {
        const { story: saved } = await adminStoriesApi.create(token, payload);
        onSaved(saved);
      }
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const uploadCover = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { file: asset } = await adminStoriesApi.uploadCover(token, file);
      update({ coverAssetId: asset.id, coverUrl: "" });
    } catch (e) {
      if (e.code === "STORAGE_NOT_CONFIGURED") {
        setError(
          "Storage isn't configured yet, so uploads are unavailable. Paste an image URL below instead.",
        );
      } else {
        setError(e.message || "Cover upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  const previewCover =
    form.coverUrl ||
    (form.coverAssetId && story?.slug ? storiesApi.coverUrl(story.slug) : "") ||
    "";

  return (
    <div className="story-editor" data-testid="story-editor">
      <header className="story-editor-header">
        <button className="ghost-button" onClick={onCancel} data-testid="story-editor-cancel">
          <ArrowLeft size={14} /> Back
        </button>
        <h2>{isEdit ? "Edit story" : "New heritage story"}</h2>
      </header>

      {error && (
        <div className="admin-error" data-testid="story-editor-error">
          {error}
        </div>
      )}

      <div className="editor-grid">
        <div>
          <label className="editor-field">
            <span>Title *</span>
            <input
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              data-testid="editor-title"
              placeholder="e.g. Diwali in the old Sabha courtyard"
            />
          </label>

          <label className="editor-field">
            <span>Subtitle</span>
            <input
              value={form.subtitle}
              onChange={(e) => update({ subtitle: e.target.value })}
              data-testid="editor-subtitle"
              placeholder="A short line under the title"
            />
          </label>

          <label className="editor-field">
            <span>Body *</span>
            <textarea
              rows={12}
              value={form.body}
              onChange={(e) => update({ body: e.target.value })}
              data-testid="editor-body"
              placeholder="Write the story here. Use blank lines to separate paragraphs."
            />
          </label>

          <div className="editor-row">
            <label className="editor-field">
              <span>Author</span>
              <input
                value={form.author}
                onChange={(e) => update({ author: e.target.value })}
                data-testid="editor-author"
              />
            </label>
            <label className="editor-field">
              <span>Tags (comma-separated)</span>
              <input
                value={form.tags}
                onChange={(e) => update({ tags: e.target.value })}
                data-testid="editor-tags"
                placeholder="heritage, festival"
              />
            </label>
          </div>
        </div>

        <aside className="editor-side">
          <div className="cover-picker">
            <span>Cover image</span>
            <div className="cover-preview" data-testid="editor-cover-preview">
              {previewCover ? (
                <img src={previewCover} alt="cover preview" />
              ) : (
                <div className="cover-placeholder">
                  <ImagePlus size={22} />
                  <small>No cover yet</small>
                </div>
              )}
            </div>
            <label className="ghost-button" data-testid="editor-cover-upload-button">
              {uploading ? <Loader2 className="spin" size={14} /> : <ImagePlus size={14} />}
              {uploading ? "Uploading..." : "Upload cover"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => uploadCover(e.target.files?.[0])}
                data-testid="editor-cover-file"
              />
            </label>
            <label className="editor-field">
              <span>Or paste an image URL</span>
              <input
                value={form.coverUrl}
                onChange={(e) => update({ coverUrl: e.target.value, coverAssetId: "" })}
                data-testid="editor-cover-url"
                placeholder="https://..."
              />
            </label>
            {(form.coverAssetId || form.coverUrl) && (
              <button
                className="ghost-button danger"
                type="button"
                onClick={() => update({ coverAssetId: "", coverUrl: "" })}
                data-testid="editor-cover-clear"
              >
                <X size={14} /> Remove cover
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="story-editor-actions">
        <button
          className="ghost-button"
          disabled={busy}
          onClick={() => submit(false)}
          data-testid="editor-save-draft"
        >
          Save as draft
        </button>
        <button
          className="primary-button"
          disabled={busy}
          onClick={() => submit(true)}
          data-testid="editor-publish"
        >
          <Check size={16} /> {form.published ? "Update & keep published" : "Publish"}
        </button>
      </footer>
    </div>
  );
}

export default function AdminStories() {
  const { token, clear } = useAdminToken();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | 'new' | story
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const { stories: list } = await adminStoriesApi.list(token, "mathura");
      setStories(list);
    } catch (e) {
      if (e.status === 401) {
        clear();
        navigate("/admin");
        return;
      }
      setError(e.message || "Could not load stories");
    } finally {
      setLoading(false);
    }
  }, [clear, navigate, token]);

  useEffect(() => {
    if (!token) {
      navigate("/admin");
      return;
    }
    load();
  }, [load, navigate, token]);

  const onSaved = (saved) => {
    setEditing(null);
    showToast(saved.published ? "Story published" : "Draft saved");
    load();
  };

  const remove = async (story) => {
    if (!window.confirm(`Delete "${story.title}"? This can't be undone.`)) return;
    try {
      await adminStoriesApi.remove(token, story.id);
      showToast("Story deleted");
      load();
    } catch (e) {
      showToast(e.message || "Delete failed");
    }
  };

  const togglePublish = async (story) => {
    try {
      await adminStoriesApi.update(token, story.id, { published: !story.published });
      showToast(!story.published ? "Story published" : "Story unpublished");
      load();
    } catch (e) {
      showToast(e.message || "Update failed");
    }
  };

  const activeStory = useMemo(() => {
    if (editing === "new") return null;
    if (editing) return editing;
    return null;
  }, [editing]);

  if (!token) return null;

  return (
    <main className="admin-media">
      <header className="admin-media-header">
        <div>
          <span className="eyebrow">
            <BookOpen size={14} /> Admin · Heritage journal
          </span>
          <h1>Community stories</h1>
          <p>Publish short heritage notes for the Mathura Sabha family to share on WhatsApp.</p>
        </div>
        <div className="admin-media-actions">
          <Link to="/admin/media" className="ghost-button" data-testid="admin-goto-media">
            Media library
          </Link>
          <Link to="/stories" className="ghost-button" data-testid="admin-goto-public-stories">
            <Eye size={14} /> View journal
          </Link>
        </div>
      </header>

      {editing !== null ? (
        <StoryEditor
          token={token}
          story={activeStory}
          onCancel={() => setEditing(null)}
          onSaved={onSaved}
        />
      ) : (
        <>
          <div className="admin-toolbar">
            <button
              className="primary-button"
              onClick={() => setEditing("new")}
              data-testid="admin-new-story"
            >
              <Plus size={16} /> New story
            </button>
          </div>

          {loading && <div className="media-empty">Loading...</div>}
          {error && (
            <div className="admin-error" data-testid="stories-admin-error">
              {error}
            </div>
          )}

          {!loading && stories.length === 0 && !error && (
            <div className="media-empty" data-testid="admin-stories-empty">
              No stories yet. Click <strong>New story</strong> to publish your first heritage note.
            </div>
          )}

          {stories.length > 0 && (
            <table className="stories-table" data-testid="admin-stories-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {stories.map((s) => (
                  <tr key={s.id} data-testid={`admin-story-row-${s.id}`}>
                    <td>
                      <strong>{s.title}</strong>
                      {s.subtitle && <small>{s.subtitle}</small>}
                    </td>
                    <td>
                      <span className={`status-pill ${s.published ? "is-live" : "is-draft"}`}>
                        {s.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>
                      <span className="story-updated">{formatDate(s.updatedAt)}</span>
                    </td>
                    <td>
                      <div className="story-row-actions">
                        <button
                          onClick={() => togglePublish(s)}
                          data-testid={`admin-story-toggle-${s.id}`}
                          className="ghost-button"
                        >
                          {s.published ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          onClick={() => setEditing(s)}
                          data-testid={`admin-story-edit-${s.id}`}
                          className="ghost-button"
                        >
                          <PenSquare size={13} /> Edit
                        </button>
                        <button
                          onClick={() => remove(s)}
                          data-testid={`admin-story-delete-${s.id}`}
                          className="ghost-button danger"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {toast && (
        <div className="admin-toast" data-testid="admin-toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
