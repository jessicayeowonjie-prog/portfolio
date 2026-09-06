// ─── EDIT CONTEXT ────────────────────────────────────────────────────────────
// Content now lives on the server (server/data/content.json) instead of
// localStorage — edits save automatically and are live for every visitor
// immediately. Edit mode still unlocks with ?edit in the URL, but since edits
// are now shared/public, entering it also requires the site's edit password.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const TOKEN_KEY = 'yj-edit-token';
const SAVE_DEBOUNCE_MS = 600;

export function ekGet(obj, path) {
  return path.split('.').reduce((a, k) => (a == null ? a : a[k]), obj);
}
export function ekSet(obj, path, val) {
  const ks = path.split('.');
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur = clone;
  for (let i = 0; i < ks.length - 1; i++) {
    const k = ks[i], nx = cur[k];
    cur[k] = Array.isArray(nx) ? [...nx] : { ...nx };
    cur = cur[k];
  }
  cur[ks[ks.length - 1]] = val;
  return clone;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  let body = null;
  try { body = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status})`);
  return body;
}

const EditCtx = createContext(null);
export function useEdit() {
  const ctx = useContext(EditCtx);
  if (!ctx) throw new Error('useEdit() must be used inside <ContentProvider>');
  return ctx;
}

export function ContentProvider({ children }) {
  const editRequested = useRef(
    (() => { try { return new URLSearchParams(location.search).has('edit'); } catch (e) { return false; } })()
  ).current;

  const [content, setContent] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  });
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(!editRequested);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [saveError, setSaveError] = useState(null);
  const saveTimer = useRef(null);
  const latestContent = useRef(null);

  // Load public content once on mount.
  useEffect(() => {
    api('/api/content').then(setContent).catch((e) => setLoadError(e.message));
  }, []);

  // If ?edit is present, verify any stored token.
  useEffect(() => {
    if (!editRequested) return;
    if (!token) { setAuthChecked(true); return; }
    api('/api/auth/verify', { headers: { 'x-edit-token': token } })
      .then(() => setAuthed(true))
      .catch(() => {
        try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
        setToken(null);
      })
      .finally(() => setAuthChecked(true));
  }, [editRequested, token]);

  const login = useCallback(async (password) => {
    const { token: t } = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) });
    try { sessionStorage.setItem(TOKEN_KEY, t); } catch (e) {}
    setToken(t);
    setAuthed(true);
  }, []);

  const logout = useCallback(() => {
    if (token) api('/api/auth/logout', { method: 'POST', headers: { 'x-edit-token': token } }).catch(() => {});
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
    setToken(null);
    setAuthed(false);
    location.search = '';
  }, [token]);

  const flushSave = useCallback((data, tok) => {
    setSaveState('saving');
    api('/api/content', { method: 'PUT', headers: { 'x-edit-token': tok }, body: JSON.stringify(data) })
      .then(() => setSaveState('saved'))
      .catch((e) => { setSaveState('error'); setSaveError(e.message); });
  }, []);

  const commit = useCallback((next) => {
    setContent(next);
    latestContent.current = next;
    if (!token) return; // shouldn't happen while editing, but stay safe
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSave(latestContent.current, token), SAVE_DEBOUNCE_MS);
  }, [token, flushSave]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const editing = editRequested && authed && !!content;

  const api_ = {
    editing,
    editRequested,
    authChecked,
    authed,
    login,
    logout,
    content,
    loadError,
    saveState,
    saveError,
    token,
    update: (path, val) => content && commit(ekSet(content, path, val)),
    listAdd: (path, item, at) => {
      if (!content) return;
      const list = [...(ekGet(content, path) || [])];
      list.splice(at == null ? list.length : at, 0, item);
      commit(ekSet(content, path, list));
    },
    listRemove: (path, i) => {
      if (!content) return;
      const list = [...(ekGet(content, path) || [])];
      list.splice(i, 1);
      commit(ekSet(content, path, list));
    },
    listMove: (path, from, to) => {
      if (!content) return;
      const list = [...(ekGet(content, path) || [])];
      if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
      const [it] = list.splice(from, 1);
      list.splice(to, 0, it);
      commit(ekSet(content, path, list));
    }
  };

  return <EditCtx.Provider value={api_}>{children}</EditCtx.Provider>;
}

// ─── EDITABLE TEXT ───────────────────────────────────────────────────────────
export function T({ path, as = 'span', style, multiline, placeholder }) {
  const { content, update, editing } = useEdit();
  const val = ekGet(content, path);
  const text = val == null ? '' : String(val);
  const ref = useRef(null);
  const Tag = as;

  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.textContent !== text) el.textContent = text;
  }, [text, editing]);

  if (!editing) return <Tag style={style}>{text || placeholder || ''}</Tag>;

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e) => {
        const el = e.currentTarget;
        const raw = multiline ? el.innerText : el.textContent;
        update(path, raw.replace(/\n+$/, '').trim());
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') { e.currentTarget.textContent = text; e.currentTarget.blur(); }
      }}
      style={{
        ...style,
        outline: '1px dashed color-mix(in srgb, currentColor 30%, transparent)',
        outlineOffset: '3px',
        borderRadius: '2px',
        cursor: 'text',
        minWidth: '24px',
        textTransform: multiline ? 'none' : style && style.textTransform,
        display: style && style.display ? style.display : 'block'
      }}
    />
  );
}

// ─── EDITABLE IMAGE ──────────────────────────────────────────────────────────
export function EditableImg({ path, alt, style, wrapStyle, onLoad, draggable }) {
  const { content, update, editing, token } = useEdit();
  const src = ekGet(content, path) || '';
  const fileRef = useRef(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 40 * 1024 * 1024) {
      setNote('That file is over 40MB — drop it into server/uploads yourself and use "path" instead.');
      return;
    }
    setNote('');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/uploads', { method: 'POST', headers: { 'x-edit-token': token }, body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Upload failed');
      update(path, body.url);
    } catch (err) {
      setNote(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!editing) return <img src={src} alt={alt} style={style} onLoad={onLoad} draggable={draggable} />;

  return (
    <div style={{ position: 'relative', ...wrapStyle }}>
      <img src={src} alt={alt} style={style} onLoad={onLoad} draggable={false} />
      <div style={{
        position: 'absolute', bottom: '6px', left: '6px', right: '6px',
        display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 20
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => fileRef.current.click()} style={ekBtn} disabled={busy}>{busy ? 'uploading…' : 'upload'}</button>
          <button onClick={() => {
            const p = prompt('Image path or URL', src);
            if (p != null) update(path, p.trim());
          }} style={ekBtn}>path</button>
        </div>
        {note && <div style={{ ...ekBtn, background: '#7a2020', cursor: 'default', lineHeight: 1.4, textTransform: 'none', letterSpacing: 0 }}>{note}</div>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
    </div>
  );
}

export const ekBtn = {
  fontFamily: "'Space Mono', monospace", fontSize: '9px',
  letterSpacing: '0.1em', textTransform: 'uppercase',
  background: 'oklch(0% 0 0 / 0.75)', color: 'white',
  border: '1px solid oklch(100% 0 0 / 0.3)', borderRadius: '2px',
  padding: '5px 9px', cursor: 'pointer'
};

export function EkIconBtn({ children, onClick, title, style }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(e); }} title={title} style={{
      width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Space Mono', monospace", fontSize: '12px', lineHeight: 1,
      background: 'oklch(0% 0 0 / 0.6)', color: 'white',
      border: '1px solid oklch(100% 0 0 / 0.25)', borderRadius: '2px',
      cursor: 'pointer', padding: 0, ...style
    }}>{children}</button>
  );
}

export function EkAddBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: "'Space Mono', monospace", fontSize: '10px',
      letterSpacing: '0.15em', textTransform: 'uppercase',
      background: 'none', color: 'var(--accent)',
      border: '1px dashed var(--accent)', borderRadius: '2px',
      padding: '10px 16px', cursor: 'pointer'
    }}>{children}</button>
  );
}

// ─── EDIT MODE TOOLBAR ───────────────────────────────────────────────────────
export function EditBar({ children }) {
  const { editing, saveState, saveError, logout } = useEdit();
  if (!editing) return null;
  const statusText = saveState === 'saving' ? 'saving…'
    : saveState === 'error' ? (saveError || 'save failed')
    : saveState === 'saved' ? 'saved'
    : 'no edits yet';
  return (
    <div style={{
      position: 'fixed', bottom: '18px', left: '18px', zIndex: 5000,
      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', maxWidth: 'calc(100vw - 36px)',
      background: 'oklch(14% 0.01 60 / 0.94)',
      border: '1px solid oklch(30% 0.01 60)', borderRadius: '3px',
      padding: '9px 12px', backdropFilter: 'blur(8px)',
      boxShadow: '0 12px 40px oklch(0% 0 0 / 0.6)'
    }}>
      <span style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        fontFamily: "'Space Mono', monospace", fontSize: '10px',
        letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)'
      }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)' }} />
        edit mode
      </span>
      {children}
      <span style={{
        fontFamily: "'Space Mono', monospace", fontSize: '9px',
        color: saveState === 'error' ? 'oklch(70% 0.18 30)' : saveState === 'saving' ? 'oklch(80% 0.12 85)' : 'var(--ink-light)',
        letterSpacing: '0.08em', whiteSpace: 'nowrap'
      }}>{statusText}</span>
      <span style={{ width: '1px', height: '18px', background: 'oklch(30% 0.01 60)' }} />
      <button onClick={() => { if (confirm('Log out of edit mode?')) logout(); }} style={ekBtn}>exit</button>
    </div>
  );
}

// ─── LOGIN GATE ──────────────────────────────────────────────────────────────
export function LoginGate() {
  const { login } = useEdit();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000, background: 'oklch(6% 0 0)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--sans)'
    }}>
      <form onSubmit={submit} style={{
        display: 'flex', flexDirection: 'column', gap: '14px',
        width: '280px', padding: '28px', border: '1px solid oklch(28% 0.01 60)', borderRadius: '4px'
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-mid)' }}>
          Enter edit mode
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{
            background: 'oklch(14% 0.01 60)', border: '1px solid oklch(30% 0.01 60)', borderRadius: '2px',
            color: 'var(--ink)', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: '13px', outline: 'none'
          }}
        />
        {error && <div style={{ color: 'oklch(70% 0.18 30)', fontSize: '11px', fontFamily: 'var(--mono)' }}>{error}</div>}
        <button type="submit" disabled={busy} style={{
          ...ekBtn, background: 'var(--accent)', border: '1px solid var(--accent)', color: 'black',
          fontWeight: 700, padding: '10px 12px', textAlign: 'center'
        }}>{busy ? 'checking…' : 'unlock'}</button>
        <a href={location.pathname} style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--ink-light)', textAlign: 'center' }}>
          ← back to the site
        </a>
      </form>
    </div>
  );
}
