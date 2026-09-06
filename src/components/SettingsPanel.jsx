// ─── SITE SETTINGS ────────────────────────────────────────────────────────────
// Replaces the Claude-Design-only TweaksPanel (which talked to the design
// canvas's host frame via postMessage — meaningless once this runs standalone).
// Same knobs — accent/background color, film border, name size — but they're
// now just more fields on the content object, saved the same way as any other
// edit, so they persist for every visitor instead of resetting per design session.
import React, { useState } from 'react';
import { useEdit } from '../context/EditContext.jsx';

const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' };
const label = { fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mid)' };

export function SettingsPanel() {
  const { editing, content, update } = useEdit();
  const [open, setOpen] = useState(false);
  if (!editing) return null;
  const s = content.settings || {};

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Site settings"
        style={{
          position: 'fixed', bottom: '18px', right: '18px', zIndex: 5000,
          width: '38px', height: '38px', borderRadius: '50%',
          background: 'oklch(14% 0.01 60 / 0.94)', border: '1px solid oklch(30% 0.01 60)',
          color: 'var(--ink)', fontSize: '16px', cursor: 'pointer',
          boxShadow: '0 12px 40px oklch(0% 0 0 / 0.6)'
        }}>⚙</button>

      {open && (
        <div style={{
          position: 'fixed', bottom: '64px', right: '18px', zIndex: 5000,
          width: '240px', display: 'flex', flexDirection: 'column', gap: '14px',
          background: 'oklch(14% 0.01 60 / 0.96)', border: '1px solid oklch(30% 0.01 60)',
          borderRadius: '4px', padding: '16px', backdropFilter: 'blur(8px)',
          boxShadow: '0 12px 40px oklch(0% 0 0 / 0.6)'
        }}>
          <div style={{ ...label, color: 'var(--accent)', fontSize: '10px' }}>Site settings</div>

          <div style={row}>
            <span style={label}>Accent color</span>
            <input type="color" value={s.accentColor || '#35a207'}
              onChange={(e) => update('settings.accentColor', e.target.value)}
              style={{ width: '44px', height: '22px', border: 'none', background: 'none', cursor: 'pointer' }} />
          </div>

          <div style={row}>
            <span style={label}>Background</span>
            <input type="text" value={s.bgColor || ''}
              onChange={(e) => update('settings.bgColor', e.target.value)}
              style={{
                width: '130px', background: 'oklch(20% 0.01 60)', border: '1px solid oklch(30% 0.01 60)',
                color: 'var(--ink)', borderRadius: '2px', padding: '4px 6px', fontFamily: 'var(--mono)', fontSize: '10px'
              }} />
          </div>

          <div style={row}>
            <span style={label}>Film border</span>
            <button
              role="switch" aria-checked={!!s.showFilmBorder}
              onClick={() => update('settings.showFilmBorder', !s.showFilmBorder)}
              style={{
                position: 'relative', width: '34px', height: '18px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                background: s.showFilmBorder ? 'var(--accent)' : 'oklch(30% 0.01 60)'
              }}>
              <span style={{
                position: 'absolute', top: '2px', left: s.showFilmBorder ? '18px' : '2px',
                width: '14px', height: '14px', borderRadius: '50%', background: 'white', transition: 'left 0.15s'
              }} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={row}><span style={label}>Name size</span><span style={label}>{s.nameSize || 88}px</span></div>
            <input type="range" min={48} max={120} step={2} value={s.nameSize || 88}
              onChange={(e) => update('settings.nameSize', Number(e.target.value))}
              style={{ width: '100%' }} />
          </div>
        </div>
      )}
    </>
  );
}
