// ─── EDIT KIT ────────────────────────────────────────────────────────────────
// Content store + inline-editing primitives. Edit mode unlocks with ?edit
// in the URL. Local edits persist in localStorage; "Export content.js"
// downloads a file you drop into the project to make them permanent.
const { useState: eUseState, useEffect: eUseEffect, useRef: eUseRef, createContext: eCreateContext, useContext: eUseContext } = React;

const EK_LS_KEY = 'yj-site-content-v1';

function ekGet(obj, path) {
  return path.split('.').reduce((a, k) => a == null ? a : a[k], obj);
}
function ekSet(obj, path, val) {
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

const EditCtx = eCreateContext(null);
function useEdit() { return eUseContext(EditCtx); }

function ContentProvider({ children }) {
  const base = window.SITE_CONTENT;
  const editing = eUseState(() => {
    try { return new URLSearchParams(location.search).has('edit'); } catch (e) { return false; }
  })[0];

  const [content, setContent] = eUseState(() => {
    try {
      const raw = localStorage.getItem(EK_LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // If content.js was replaced (new stamp), the file wins.
        if (saved && saved.stamp === base.stamp && saved.data) return saved.data;
      }
    } catch (e) {}
    return base;
  });
  const [dirty, setDirty] = eUseState(() => {
    try {
      const raw = localStorage.getItem(EK_LS_KEY);
      return !!(raw && JSON.parse(raw).stamp === base.stamp);
    } catch (e) { return false; }
  });

  const commit = (next) => {
    setContent(next);
    setDirty(true);
    try { localStorage.setItem(EK_LS_KEY, JSON.stringify({ stamp: base.stamp, data: next })); } catch (e) {}
  };

  const api = {
    editing,
    content,
    dirty,
    update: (path, val) => commit(ekSet(content, path, val)),
    listAdd: (path, item, at) => {
      const list = [...(ekGet(content, path) || [])];
      list.splice(at == null ? list.length : at, 0, item);
      commit(ekSet(content, path, list));
    },
    listRemove: (path, i) => {
      const list = [...(ekGet(content, path) || [])];
      list.splice(i, 1);
      commit(ekSet(content, path, list));
    },
    listMove: (path, from, to) => {
      const list = [...(ekGet(content, path) || [])];
      if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
      const [it] = list.splice(from, 1);
      list.splice(to, 0, it);
      commit(ekSet(content, path, list));
    },
    discard: () => {
      try { localStorage.removeItem(EK_LS_KEY); } catch (e) {}
      setContent(base);
      setDirty(false);
    },
    exportFile: () => {
      const out = { ...content, stamp: new Date().toISOString() };
      const body =
      '// ─────────────────────────────────────────────────────────────────────────────\n' +
      '// SITE CONTENT — exported ' + new Date().toLocaleString() + '\n' +
      '// Replace content.js in the project with this file to publish these edits.\n' +
      '// ─────────────────────────────────────────────────────────────────────────────\n' +
      'window.SITE_CONTENT = ' + JSON.stringify(out, null, 2) + ';\n';
      const blob = new Blob([body], { type: 'text/javascript' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'content.js';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  };

  return <EditCtx.Provider value={api}>{children}</EditCtx.Provider>;
}

// ─── EDITABLE TEXT ───────────────────────────────────────────────────────────
function T({ path, as = 'span', style, multiline, placeholder }) {
  const { content, update, editing } = useEdit();
  const val = ekGet(content, path);
  const text = val == null ? '' : String(val);
  const ref = eUseRef(null);
  const Tag = as;

  eUseEffect(() => {
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
      }} />);

}

// ─── EDITABLE IMAGE ──────────────────────────────────────────────────────────
function EditableImg({ path, alt, style, wrapStyle, onLoad, draggable }) {
  const { content, update, editing } = useEdit();
  const src = ekGet(content, path) || '';
  const fileRef = eUseRef(null);
  const [note, setNote] = eUseState('');

  const pick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) {
      setNote('That image is over 3 MB — it will make content.js very large. Prefer dropping the file into uploads/ and typing its path.');
    }
    const r = new FileReader();
    r.onload = () => update(path, r.result);
    r.readAsDataURL(f);
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
          <button onClick={() => fileRef.current.click()} style={ekBtn}>upload</button>
          <button onClick={() => {
            const p = prompt('Image path or URL', src.startsWith('data:') ? 'uploads/' : src);
            if (p != null) update(path, p.trim());
          }} style={ekBtn}>path</button>
        </div>
        {note && <div style={{ ...ekBtn, background: '#7a2020', cursor: 'default', lineHeight: 1.4, textTransform: 'none', letterSpacing: 0 }}>{note}</div>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
    </div>);

}

const ekBtn = {
  fontFamily: "'Space Mono', monospace", fontSize: '9px',
  letterSpacing: '0.1em', textTransform: 'uppercase',
  background: 'oklch(0% 0 0 / 0.75)', color: 'white',
  border: '1px solid oklch(100% 0 0 / 0.3)', borderRadius: '2px',
  padding: '5px 9px', cursor: 'pointer'
};

function EkIconBtn({ children, onClick, title, style }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(e); }} title={title} style={{
      width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Space Mono', monospace", fontSize: '12px', lineHeight: 1,
      background: 'oklch(0% 0 0 / 0.6)', color: 'white',
      border: '1px solid oklch(100% 0 0 / 0.25)', borderRadius: '2px',
      cursor: 'pointer', padding: 0, ...style
    }}>{children}</button>);

}

function EkAddBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: "'Space Mono', monospace", fontSize: '10px',
      letterSpacing: '0.15em', textTransform: 'uppercase',
      background: 'none', color: 'var(--accent)',
      border: '1px dashed var(--accent)', borderRadius: '2px',
      padding: '10px 16px', cursor: 'pointer'
    }}>{children}</button>);

}

// ─── EDIT MODE TOOLBAR ───────────────────────────────────────────────────────
function EditBar({ children }) {
  const { editing, dirty, exportFile, discard } = useEdit();
  if (!editing) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '18px', left: '18px', zIndex: 5000,
      display: 'flex', alignItems: 'center', gap: '8px',
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
        color: dirty ? 'oklch(80% 0.12 85)' : 'var(--ink-light)', letterSpacing: '0.08em', whiteSpace: 'nowrap'
      }}>{dirty ? 'unsaved to file' : 'no local edits'}</span>
      <span style={{ width: '1px', height: '18px', background: 'oklch(30% 0.01 60)' }} />
      <button onClick={exportFile} style={{ ...ekBtn, background: 'var(--accent)', border: '1px solid var(--accent)', color: 'black', fontWeight: 700 }}>export content.js</button>
      <button onClick={() => { if (confirm('Discard all local edits and go back to content.js?')) discard(); }} style={ekBtn}>discard</button>
      <button onClick={() => { location.search = ''; }} style={ekBtn}>exit</button>
    </div>);

}

Object.assign(window, { ContentProvider, useEdit, T, EditableImg, EditBar, EkIconBtn, EkAddBtn, ekGet, ekSet, ekBtn });
