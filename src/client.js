// Thin fetch wrapper for the JSON API. Throws on non-ok responses so React
// Query can surface errors.
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;
  if (!res.ok || (body && body.ok === false)) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body ? body.data : null;
}

export const api = {
  get: (url) => request(url),
  post: (url, data) => request(url, { method: "POST", body: JSON.stringify(data ?? {}) }),
  put: (url, data) => request(url, { method: "PUT", body: JSON.stringify(data ?? {}) }),
  patch: (url, data) => request(url, { method: "PATCH", body: JSON.stringify(data ?? {}) }),
  del: (url) => request(url, { method: "DELETE" }),
};
