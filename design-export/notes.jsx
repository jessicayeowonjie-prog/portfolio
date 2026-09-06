// ─── STICKY NOTES (edit-aware) ───────────────────────────────────────────────
const { useState: nUseState } = React;

const NOTE_COLORS = {
  yellow: { bg: '#fef3a3', accent: '#c9a82b', tape: '#e8d77a' },
  pink: { bg: '#ffd1dc', accent: '#c97595', tape: '#f4b3c5' },
  green: { bg: '#c4e8c2', accent: '#5fa05b', tape: '#a3d3a0' },
  blue: { bg: '#bcdfff', accent: '#5081b8', tape: '#9ec6f0' },
  peach: { bg: '#ffd9b3', accent: '#c97a3a', tape: '#f0bb8a' },
  lavender: { bg: '#e1c4ff', accent: '#8c5fc2', tape: '#c9a3f0' }
};
const COLOR_KEYS = Object.keys(NOTE_COLORS);
const STATUS_META = {
  ongoing: { label: 'in progress', dot: '#5fa05b' },
  upcoming: { label: 'upcoming', dot: '#5081b8' },
  completed: { label: 'archived', dot: '#999' }
};
const NOTE_ROTATIONS = [-2.5, 1.8, -1.2, 2.3, -2, 1.5, -1.8, 2];

let noteDragFrom = null;

function newNote() {
  return {
    year: String(new Date().getFullYear()), status: 'ongoing', color: 'yellow',
    title: 'New project', fullTitle: '', subtitle: '', type: 'Working paper',
    role: 'Author', description: 'What this project is about.', tags: [], link: ''
  };
}

// ─── TAG EDITOR ──────────────────────────────────────────────────────────────
function TagEditor({ path, size = 10 }) {
  const { content, update } = useEdit();
  const tags = ekGet(content, path) || [];
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
      {tags.map((t, i) =>
      <span key={i} style={{
        fontFamily: 'var(--mono)', fontSize: `${size}px`, display: 'flex', alignItems: 'center', gap: '5px',
        padding: '3px 6px 3px 9px', background: 'oklch(0% 0 0 / 0.08)',
        color: '#3a3020', borderRadius: '2px', letterSpacing: '0.05em'
      }}>
          {t}
          <button onClick={() => update(path, tags.filter((_, j) => j !== i))} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'var(--mono)', fontSize: '11px', color: '#6b5d3f'
          }}>×</button>
        </span>
      )}
      <button onClick={() => {
        const v = prompt('New tag');
        if (v && v.trim()) update(path, [...tags, v.trim()]);
      }} style={{
        fontFamily: 'var(--mono)', fontSize: `${size}px`, padding: '3px 8px',
        background: 'none', border: '1px dashed oklch(0% 0 0 / 0.3)',
        color: '#6b5d3f', borderRadius: '2px', cursor: 'pointer'
      }}>+ tag</button>
    </div>);

}

// ─── STICKY NOTE ─────────────────────────────────────────────────────────────
function StickyNote({ project, absIndex, rotation }) {
  const { editing, update, listRemove, listMove } = useEdit();
  const [open, setOpen] = nUseState(false);
  const [hovered, setHovered] = nUseState(false);
  const [dropTarget, setDropTarget] = nUseState(false);
  const color = NOTE_COLORS[project.color] || NOTE_COLORS.yellow;
  const meta = STATUS_META[project.status] || STATUS_META.completed;
  const base = `projects.${absIndex}`;

  const cycleColor = () => {
    const i = COLOR_KEYS.indexOf(project.color);
    update(`${base}.color`, COLOR_KEYS[(i + 1) % COLOR_KEYS.length]);
  };

  return (
    <>
      <div
        draggable={editing}
        onDragStart={() => {noteDragFrom = absIndex;}}
        onDragEnd={() => {noteDragFrom = null;setDropTarget(false);}}
        onDragOver={(e) => {if (editing && noteDragFrom != null && noteDragFrom !== absIndex) {e.preventDefault();setDropTarget(true);}}}
        onDragLeave={() => setDropTarget(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropTarget(false);
          if (noteDragFrom != null) listMove('projects', noteDragFrom, absIndex);
          noteDragFrom = null;
        }}
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          background: color.bg,
          padding: '32px 24px 24px',
          width: '100%',
          minHeight: '200px',
          cursor: editing ? 'grab' : 'pointer',
          transform: `rotate(${hovered ? 0 : rotation}deg) translateY(${hovered ? '-4px' : '0'})`,
          transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s',
          boxShadow: dropTarget ?
          '0 0 0 3px var(--accent), 0 18px 40px oklch(0% 0 0 / 0.5)' :
          hovered ?
          '0 18px 40px oklch(0% 0 0 / 0.5), 0 4px 12px oklch(0% 0 0 / 0.3)' :
          '0 8px 18px oklch(0% 0 0 / 0.35), 0 2px 4px oklch(0% 0 0 / 0.2)',
          color: '#2a2418',
          fontFamily: 'var(--sans)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>

        <div style={{
          position: 'absolute', top: '-12px', left: '50%',
          transform: 'translateX(-50%) rotate(-3deg)',
          width: '70px', height: '22px', background: color.tape,
          opacity: 0.85, boxShadow: '0 2px 4px oklch(0% 0 0 / 0.2)'
        }} />

        {editing && hovered &&
        <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '4px', zIndex: 10 }}>
            <EkIconBtn title="Cycle colour" onClick={cycleColor} style={{ background: color.accent, borderColor: 'oklch(0% 0 0 / 0.25)' }}>◑</EkIconBtn>
            <EkIconBtn title="Delete note" onClick={() => {if (confirm('Delete this note?')) listRemove('projects', absIndex);}}>×</EkIconBtn>
          </div>
        }
        {editing && hovered &&
        <div style={{
          position: 'absolute', bottom: '6px', right: '8px', zIndex: 10,
          fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.1em',
          color: '#6b5d3f', textTransform: 'uppercase'
        }}>drag to reorder</div>
        }

        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '9px', fontFamily: 'var(--mono)',
          letterSpacing: '0.15em', textTransform: 'uppercase',
          color: '#6b5d3f', alignSelf: 'flex-start'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.dot }} />
          {meta.label} · {project.year}
        </div>

        <h3 style={{
          fontSize: '22px', fontWeight: 400, lineHeight: 1.15,
          color: '#2a2418', letterSpacing: '-0.01em',
          fontFamily: '"DM Serif Display"'
        }}>{project.title}</h3>

        <div style={{
          fontFamily: 'var(--mono)', fontSize: '10px',
          letterSpacing: '0.08em', color: color.accent, fontWeight: 700
        }}>{project.role}</div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '8px' }}>
          {(project.tags || []).map((t) =>
          <span key={t} style={{
            fontFamily: 'var(--mono)', fontSize: '9px',
            padding: '2px 7px', background: 'oklch(0% 0 0 / 0.08)',
            color: '#3a3020', borderRadius: '2px', letterSpacing: '0.05em'
          }}>{t}</span>
          )}
        </div>
      </div>

      {open &&
      <div onClick={() => setOpen(false)} style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'oklch(0% 0 0 / 0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px', backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.25s ease', overflowY: 'auto'
      }}>
          <div onClick={(e) => e.stopPropagation()} style={{
          background: color.bg, maxWidth: '560px', width: '100%',
          padding: '48px 40px 36px', position: 'relative',
          color: '#2a2418', fontFamily: 'var(--sans)',
          boxShadow: '0 30px 80px oklch(0% 0 0 / 0.6)',
          animation: 'noteIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          margin: 'auto'
        }}>
            <div style={{
            position: 'absolute', top: '-14px', left: '50%',
            transform: 'translateX(-50%) rotate(-2deg)',
            width: '110px', height: '26px', background: color.tape, opacity: 0.85,
            boxShadow: '0 2px 6px oklch(0% 0 0 / 0.25)'
          }} />
            <button onClick={() => setOpen(false)} style={{
            position: 'absolute', top: '14px', right: '14px',
            width: '28px', height: '28px', background: 'none', border: 'none',
            fontSize: '20px', cursor: 'pointer', color: '#2a2418', fontFamily: 'var(--mono)'
          }}>×</button>

            {editing &&
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
            paddingBottom: '18px', marginBottom: '18px',
            borderBottom: '1px dashed oklch(0% 0 0 / 0.25)'
          }}>
                <select value={project.status} onChange={(e) => update(`${base}.status`, e.target.value)} style={noteSelect}>
                  <option value="ongoing">In Progress</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Archive</option>
                </select>
                <T path={`${base}.year`} style={{ ...noteSelect, display: 'inline-block', minWidth: '54px' }} />
                <div style={{ display: 'flex', gap: '5px' }}>
                  {COLOR_KEYS.map((k) =>
              <button key={k} onClick={() => update(`${base}.color`, k)} title={k} style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: NOTE_COLORS[k].bg, cursor: 'pointer',
                border: project.color === k ? '2px solid #2a2418' : '1px solid oklch(0% 0 0 / 0.2)'
              }} />
              )}
                </div>
              </div>
          }

            <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '10px', fontFamily: 'var(--mono)',
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#6b5d3f', marginBottom: '14px'
          }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: meta.dot }} />
              {meta.label} · {project.year}
            </div>

            {editing ?
          <>
                {noteField('Short title (on the note)')}
                <T path={`${base}.title`} as="h2" style={noteH2} />
                {noteField('Full title')}
                <T path={`${base}.fullTitle`} as="h2" multiline style={{ ...noteH2, fontSize: '22px' }} placeholder="(same as short title)" />
                {noteField('Subtitle')}
                <T path={`${base}.subtitle`} multiline style={{ fontStyle: 'italic', fontSize: '14px', color: '#5a4a30', marginBottom: '16px', lineHeight: 1.4 }} placeholder="optional" />
              </> :

          <h2 style={{ ...noteH2, fontSize: '32px' }}>{project.fullTitle || project.title}</h2>
          }

            {!editing && project.subtitle &&
          <p style={{ fontStyle: 'italic', fontSize: '14px', color: '#5a4a30', marginBottom: '16px', lineHeight: 1.4 }}>{project.subtitle}</p>
          }

            {editing && noteField('Role')}
            <T path={`${base}.role`} style={{
            fontFamily: 'var(--mono)', fontSize: '11px', color: color.accent,
            fontWeight: 700, letterSpacing: '0.08em', marginBottom: '6px'
          }} />

            {editing && noteField('Venue / type')}
            <T path={`${base}.type`} style={{
            fontFamily: 'var(--mono)', fontSize: '10px', color: '#6b5d3f',
            letterSpacing: '0.08em', marginBottom: '20px'
          }} />

            {editing && noteField('Description')}
            <T path={`${base}.description`} as="p" multiline style={{
            fontSize: '15px', lineHeight: 1.65, color: '#3a3020', marginBottom: '20px'
          }} />

            {editing && noteField('Tags')}
            <div style={{ marginBottom: '20px' }}>
              {editing ?
            <TagEditor path={`${base}.tags`} /> :

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(project.tags || []).map((t) =>
              <span key={t} style={{
                fontFamily: 'var(--mono)', fontSize: '10px',
                padding: '3px 9px', background: 'oklch(0% 0 0 / 0.08)',
                color: '#3a3020', borderRadius: '2px', letterSpacing: '0.05em'
              }}>{t}</span>
              )}
                </div>
            }
            </div>

            <div style={{ paddingTop: '14px', borderTop: '1px dashed oklch(0% 0 0 / 0.2)' }}>
              {editing ?
            <>
                  {noteField('Link (paper / repo)')}
                  <T path={`${base}.link`} style={{
                fontFamily: 'var(--mono)', fontSize: '11px', color: color.accent,
                letterSpacing: '0.05em', wordBreak: 'break-all'
              }} placeholder="https://" />
                </> :
            project.link ?
            <a href={project.link} target="_blank" rel="noopener noreferrer" style={{
              fontFamily: 'var(--mono)', fontSize: '11px', color: color.accent,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              textDecoration: 'none', fontWeight: 700
            }}>↗ view project / paper</a> :

            <span style={{
              fontFamily: 'var(--mono)', fontSize: '10px', color: '#6b5d3f',
              letterSpacing: '0.1em', textTransform: 'uppercase', fontStyle: 'italic'
            }}>link coming soon</span>
            }
            </div>
          </div>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes noteIn { from { opacity: 0; transform: scale(0.85) rotate(-3deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
          `}</style>
        </div>
      }
    </>);

}

const noteH2 = {
  fontSize: '26px', fontWeight: 400, lineHeight: 1.1,
  letterSpacing: '-0.015em', marginBottom: '12px',
  color: '#2a2418', fontFamily: '"DM Serif Display"'
};
const noteSelect = {
  fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.08em',
  background: 'oklch(0% 0 0 / 0.06)', color: '#2a2418',
  border: '1px solid oklch(0% 0 0 / 0.25)', borderRadius: '2px',
  padding: '5px 8px', cursor: 'pointer'
};
function noteField(label) {
  return (
    <div style={{
      fontFamily: 'var(--mono)', fontSize: '8px', letterSpacing: '0.2em',
      textTransform: 'uppercase', color: '#8a7a55', marginBottom: '5px', marginTop: '4px'
    }}>{label}</div>);

}

Object.assign(window, { StickyNote, TagEditor, NOTE_COLORS, COLOR_KEYS, STATUS_META, NOTE_ROTATIONS, newNote });
