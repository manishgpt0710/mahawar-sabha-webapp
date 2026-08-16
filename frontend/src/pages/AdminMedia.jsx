import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  LogOut,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const TOKEN_KEY = "mahawar_admin_token";

const LOCATIONS = [
  { slug: "mathura", label: "Mathura" },
  { slug: "rewari", label: "Rewari" },
];
const CATEGORIES = [
  { slug: "gallery", label: "Gallery", icon: ImageIcon, accept: "image/jpeg,image/png,image/webp,image/gif" },
  { slug: "documents", label: "Documents", icon: FileText, accept: "application/pdf,.doc,.docx" },
];

function formatBytes(n) {
  if (!n && n !== 0) return "";
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function useAdminToken() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const save = useCallback((t) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }, []);
  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
  }, []);
  return { token, save, clear };
}

function SignIn({ onSignIn }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin/media?location=mathura&category=gallery`, {
        headers: { Authorization: `Bearer ${value}` },
      });
      if (r.status === 401) {
        setError("Invalid admin token. Please check with your administrator.");
      } else if (!r.ok) {
        setError(`Unexpected response (${r.status}). Please try again.`);
      } else {
        onSignIn(value);
      }
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-page">
      <form className="admin-card" onSubmit={submit} data-testid="admin-signin-form">
        <ShieldCheck size={38} />
        <span className="eyebrow">Protected space</span>
        <h1>Sabha administration</h1>
        <p>Sign in with your admin token to manage community gallery images and documents.</p>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter admin token"
          className="admin-input"
          data-testid="admin-token-input"
          autoFocus
          required
        />
        {error && (
          <div className="admin-error" data-testid="admin-signin-error">
            {error}
          </div>
        )}
        <button className="primary-button" disabled={busy || !value} data-testid="admin-signin-submit">
          {busy ? "Verifying..." : "Continue"}
        </button>
        <small className="admin-hint">
          Ask the community admin if you don&apos;t have a token yet.
        </small>
      </form>
    </main>
  );
}

function PreviewModal({ file, token, onClose }) {
  if (!file) return null;
  const isImage = file.contentType?.startsWith("image/");
  const url = `${API_BASE}/api/admin/media/${file.id}/download?inline=1&token=${encodeURIComponent(token)}`;
  return (
    <div className="media-modal" role="dialog" data-testid="media-preview-modal" onClick={onClose}>
      <div className="media-modal-body" onClick={(e) => e.stopPropagation()}>
        <button className="media-modal-close" onClick={onClose} data-testid="media-preview-close" aria-label="Close">
          <X />
        </button>
        <div className="media-modal-title">
          <strong>{file.originalName}</strong>
          <small>{formatBytes(file.size)} · {file.contentType}</small>
        </div>
        <div className="media-modal-content">
          {isImage ? (
            <img src={url} alt={file.originalName} data-testid="media-preview-image" />
          ) : (
            <iframe src={url} title={file.originalName} data-testid="media-preview-frame" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminMedia() {
  const { token, save, clear } = useAdminToken();
  const navigate = useNavigate();
  const [location, setLocation] = useState("mathura");
  const [category, setCategory] = useState("gallery");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [listError, setListError] = useState("");
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState("");
  const dropRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeCategory = CATEGORIES.find((c) => c.slug === category);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/admin/media/status`);
      setStatus(await r.json());
    } catch {
      setStatus({ configured: false });
    }
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setListError("");
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/media?location=${location}&category=${category}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (r.status === 401) {
        clear();
        return;
      }
      const body = await r.json();
      if (!r.ok) {
        setListError(body.message || "Could not load files.");
        setFiles([]);
      } else {
        setFiles(body.files || []);
      }
    } catch (e) {
      setListError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [token, location, category, clear]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = useCallback(
    async (file) => {
      if (!file) return;
      setUploadError("");
      setUploadBusy(true);
      const form = new FormData();
      form.append("file", file);
      form.append("location", location);
      form.append("category", category);
      try {
        const r = await fetch(`${API_BASE}/api/admin/media/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          setUploadError(body.message || `Upload failed (${r.status}).`);
        } else {
          showToast("File uploaded");
          load();
        }
      } catch (e) {
        setUploadError("Upload failed. Please try again.");
      } finally {
        setUploadBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [category, load, location, showToast, token],
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      dropRef.current?.classList.remove("is-dragging");
      const file = e.dataTransfer.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const remove = useCallback(
    async (file) => {
      if (!window.confirm(`Delete "${file.originalName}"? This cannot be undone.`)) return;
      const r = await fetch(`${API_BASE}/api/admin/media/${file.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok && r.status !== 204) {
        const body = await r.json().catch(() => ({}));
        showToast(body.message || "Delete failed");
      } else {
        showToast("Deleted");
        load();
      }
    },
    [load, showToast, token],
  );

  const copyUrl = useCallback(
    async (file) => {
      const url = `${API_BASE}/api/admin/media/${file.id}/download?token=${encodeURIComponent(token)}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast("Download URL copied");
      } catch {
        showToast("Copy failed – long-press the download link instead");
      }
    },
    [showToast, token],
  );

  const downloadHref = useCallback(
    (file) => `${API_BASE}/api/admin/media/${file.id}/download?token=${encodeURIComponent(token)}`,
    [token],
  );

  if (!token) {
    return <SignIn onSignIn={save} />;
  }

  return (
    <main className="admin-media">
      <header className="admin-media-header">
        <div>
          <span className="eyebrow"><ShieldCheck size={14} /> Admin · Media library</span>
          <h1>Community media</h1>
          <p>Upload and organise gallery images and documents for each Sabha location.</p>
        </div>
        <div className="admin-media-actions">
          <Link to="/admin/stories" className="ghost-button" data-testid="admin-goto-stories">
            Journal
          </Link>
          <button
            className="ghost-button"
            onClick={() => navigate("/")}
            data-testid="admin-back-home"
          >
            View site
          </button>
          <button
            className="ghost-button"
            onClick={() => { clear(); navigate("/admin"); }}
            data-testid="admin-signout"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      {status && !status.configured && (
        <div className="admin-banner" data-testid="storage-not-configured-banner">
          <strong>Storage not configured.</strong> Add <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> to enable uploads. Listing works even without credentials.
        </div>
      )}

      <div className="admin-toolbar">
        <div className="tab-group" role="tablist" aria-label="Location">
          {LOCATIONS.map((loc) => (
            <button
              key={loc.slug}
              role="tab"
              aria-selected={location === loc.slug}
              className={`tab ${location === loc.slug ? "is-active" : ""}`}
              onClick={() => setLocation(loc.slug)}
              data-testid={`media-location-tab-${loc.slug}`}
            >
              {loc.label}
            </button>
          ))}
        </div>
        <div className="tab-group" role="tablist" aria-label="Category">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.slug}
                role="tab"
                aria-selected={category === cat.slug}
                className={`tab ${category === cat.slug ? "is-active" : ""}`}
                onClick={() => setCategory(cat.slug)}
                data-testid={`media-category-tab-${cat.slug}`}
              >
                <Icon size={14} /> {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={dropRef}
        className={`upload-drop ${uploadBusy ? "is-busy" : ""}`}
        onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("is-dragging"); }}
        onDragLeave={() => dropRef.current?.classList.remove("is-dragging")}
        onDrop={onDrop}
        data-testid="media-upload-drop"
      >
        <UploadCloud size={32} />
        <div>
          <strong>
            {uploadBusy
              ? "Uploading..."
              : `Drop a ${activeCategory.label.toLowerCase()} file here`}
          </strong>
          <small>
            {activeCategory.slug === "gallery"
              ? "JPG, PNG, WEBP or GIF · up to 10 MB"
              : "PDF, DOC or DOCX · up to 15 MB"}
          </small>
        </div>
        <label className="primary-button" data-testid="media-upload-picker">
          Choose file
          <input
            ref={fileInputRef}
            type="file"
            accept={activeCategory.accept}
            onChange={(e) => handleUpload(e.target.files?.[0])}
            hidden
            data-testid="media-upload-input"
          />
        </label>
      </div>

      {uploadError && (
        <div className="admin-error" data-testid="media-upload-error">
          {uploadError}
        </div>
      )}

      <section className="media-list">
        <div className="media-list-head">
          <h2>
            {activeCategory.label} · {LOCATIONS.find((l) => l.slug === location).label}
          </h2>
          <span data-testid="media-count-badge">{files.length} items</span>
        </div>

        {listError && (
          <div className="admin-error" data-testid="media-list-error">{listError}</div>
        )}

        {loading ? (
          <div className="media-empty" data-testid="media-loading">Loading...</div>
        ) : files.length === 0 ? (
          <div className="media-empty" data-testid="media-empty-state">
            No {activeCategory.label.toLowerCase()} uploaded yet.
          </div>
        ) : (
          <ul className="media-grid" data-testid="media-grid">
            {files.map((file) => {
              const isImage = file.contentType?.startsWith("image/");
              return (
                <li key={file.id} className="media-card" data-testid={`media-card-${file.id}`}>
                  <button
                    type="button"
                    className="media-thumb"
                    onClick={() => setPreview(file)}
                    data-testid={`media-preview-${file.id}`}
                    aria-label={`Preview ${file.originalName}`}
                  >
                    {isImage ? (
                      <img
                        src={`${API_BASE}/api/admin/media/${file.id}/download?inline=1&token=${encodeURIComponent(token)}`}
                        alt={file.originalName}
                      />
                    ) : (
                      <FileText size={40} />
                    )}
                  </button>
                  <div className="media-meta">
                    <strong title={file.originalName}>{file.originalName}</strong>
                    <small>{formatBytes(file.size)} · {formatDate(file.createdAt)}</small>
                  </div>
                  <div className="media-card-actions">
                    <button
                      onClick={() => copyUrl(file)}
                      data-testid={`media-copy-${file.id}`}
                      title="Copy download URL"
                    >
                      <Copy size={14} />
                    </button>
                    <a
                      href={downloadHref(file)}
                      data-testid={`media-download-${file.id}`}
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => remove(file)}
                      className="danger"
                      data-testid={`media-delete-${file.id}`}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PreviewModal file={preview} token={token} onClose={() => setPreview(null)} />

      {toast && (
        <div className="admin-toast" data-testid="admin-toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
