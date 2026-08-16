const API_BASE = process.env.REACT_APP_BACKEND_URL;

async function jsonOrThrow(resp) {
  const contentType = resp.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await resp.json().catch(() => ({})) : {};
  if (!resp.ok) {
    const err = new Error(data.message || `Request failed (${resp.status})`);
    err.status = resp.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

export const storiesApi = {
  list: async (location = "mathura") => {
    const r = await fetch(`${API_BASE}/api/stories?location=${encodeURIComponent(location)}`);
    return jsonOrThrow(r);
  },
  get: async (slug) => {
    const r = await fetch(`${API_BASE}/api/stories/${encodeURIComponent(slug)}`);
    return jsonOrThrow(r);
  },
  coverUrl: (slug) => `${API_BASE}/api/stories/${encodeURIComponent(slug)}/cover`,
};

export const adminStoriesApi = {
  list: async (token, location = "mathura") => {
    const r = await fetch(`${API_BASE}/api/admin/stories?location=${encodeURIComponent(location)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return jsonOrThrow(r);
  },
  get: async (token, id) => {
    const r = await fetch(`${API_BASE}/api/admin/stories/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return jsonOrThrow(r);
  },
  create: async (token, payload) => {
    const r = await fetch(`${API_BASE}/api/admin/stories`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return jsonOrThrow(r);
  },
  update: async (token, id, payload) => {
    const r = await fetch(`${API_BASE}/api/admin/stories/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return jsonOrThrow(r);
  },
  remove: async (token, id) => {
    const r = await fetch(`${API_BASE}/api/admin/stories/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok && r.status !== 204) throw new Error(`Delete failed (${r.status})`);
  },
  uploadCover: async (token, file, location = "mathura") => {
    const form = new FormData();
    form.append("file", file);
    form.append("location", location);
    form.append("category", "gallery");
    const r = await fetch(`${API_BASE}/api/admin/media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return jsonOrThrow(r); // { file: { id, ... } }
  },
};

export function buildWhatsAppShareUrl({ title, excerpt, url }) {
  const message = `${title}${excerpt ? ` — ${excerpt}` : ""}\n\nRead more: ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
