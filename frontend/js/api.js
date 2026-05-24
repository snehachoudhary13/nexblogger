async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('nexblogger_token');
  const isFormData = opts.body instanceof FormData;
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(path, {
    ...opts,
    headers,
    body: isFormData ? opts.body : (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const api = {
  get:    p     => apiFetch(p),
  post:   (p,b) => apiFetch(p, { method:'POST',   body:b }),
  delete: p     => apiFetch(p, { method:'DELETE' }),
  upload: (p,f) => apiFetch(p, { method:'POST',   body:f }),
};
