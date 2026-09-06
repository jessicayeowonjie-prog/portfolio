// ─── INNER PAGE: nav + research board + press + about + contact ─────────────
import React, { useEffect, useRef, useState } from 'react';
import { useEdit, EditableImg, EkIconBtn, EkAddBtn, ekBtn, T } from '../context/EditContext.jsx';
import { StickyNote, NOTE_ROTATIONS, newNote } from './Notes.jsx';

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ onBack, active, setActive, links }) {
  const { content } = useEdit();
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: '56px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 48px',
      background: 'var(--bg)', borderBottom: '1px solid oklch(22% 0.01 60)', zIndex: 100
    }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--serif)', fontSize: '18px',
        color: 'var(--ink)', letterSpacing: '-0.01em',
        display: 'flex', alignItems: 'center', gap: '8px', padding: 0
      }}>
        <span style={{ fontSize: '13px', fontFamily: 'var(--mono)' }}>←</span>
        {content.home.nameFirst} {content.home.nameLast}
      </button>
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
        {links.map((l) => (
          <button key={l} onClick={() => setActive(l)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--mono)', fontSize: '11px',
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: active === l ? 'var(--accent)' : 'var(--ink-light)',
            padding: '4px 0',
            borderBottom: active === l ? '1.5px solid var(--accent)' : '1.5px solid transparent',
            transition: 'color 0.2s, border-color 0.2s'
          }}>{l}</button>
        ))}
      </div>
    </nav>
  );
}

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────
function Section({ id, children, style }) {
  return (
    <section id={id} style={{ padding: '80px 0', borderBottom: '1px solid oklch(22% 0.01 60)', ...style }}>
      {children}
    </section>
  );
}

function SectionLabel({ path, index, count }) {
  const { editing, listMove } = useEdit();
  return (
    <div style={{
      letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '40px',
      display: 'flex', alignItems: 'center', gap: '16px',
      color: 'rgb(255, 255, 255)', fontFamily: '"Space Mono"', fontSize: '20px'
    }}>
      <T path={path} style={{ display: 'inline-block' }} />
      {editing && (
        <span style={{ display: 'flex', gap: '4px' }}>
          <EkIconBtn title="Move section up" onClick={() => listMove('sections', index, index - 1)} style={{ opacity: index === 0 ? 0.3 : 1 }}>↑</EkIconBtn>
          <EkIconBtn title="Move section down" onClick={() => listMove('sections', index, index + 1)} style={{ opacity: index === count - 1 ? 0.3 : 1 }}>↓</EkIconBtn>
        </span>
      )}
      <div style={{ flex: 1, height: '1px', background: 'oklch(22% 0.01 60)' }} />
    </div>
  );
}

// ─── RESEARCH BOARD ───────────────────────────────────────────────────────────
function ResearchBoard() {
  const { content, editing, listAdd } = useEdit();
  const projects = content.projects;
  const indexed = projects.map((p, i) => ({ p, i }));
  const groups = [
    { label: 'In Progress', status: 'ongoing', accent: '#5fa05b' },
    { label: 'Upcoming', status: 'upcoming', accent: '#5081b8' },
    { label: 'Archive', status: 'completed', accent: '#999' }
  ];

  return (
    <>
      <T path="research.hint" style={{
        fontFamily: 'var(--mono)', letterSpacing: '0.08em',
        color: 'var(--ink-light)', marginBottom: '32px', fontSize: '15px'
      }} />

      {groups.map((g) => {
        const list = indexed.filter(({ p }) =>
          g.status === 'completed'
            ? p.status === 'completed' || p.status === 'archived' || !p.status
            : p.status === g.status
        );
        if (list.length === 0 && !editing) return null;
        return (
          <div key={g.status} style={{ marginBottom: '56px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: g.accent }} />
              <h4 style={{
                fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 400,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-mid)'
              }}>{g.label} <span style={{ color: 'var(--ink-light)', marginLeft: '6px' }}>({list.length})</span></h4>
              <div style={{ flex: 1, height: '1px', background: 'oklch(20% 0.01 60)' }} />
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '40px 32px', paddingTop: '12px', alignItems: 'start'
            }}>
              {list.map(({ p, i }) => (
                <StickyNote key={i} project={p} absIndex={i} rotation={NOTE_ROTATIONS[i % NOTE_ROTATIONS.length]} />
              ))}
              {editing && (
                <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EkAddBtn onClick={() => listAdd('projects', { ...newNote(), status: g.status })}>+ add note</EkAddBtn>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── PRESS ────────────────────────────────────────────────────────────────────
function PressList() {
  const { content, editing, update, listAdd, listRemove } = useEdit();
  const items = content.press.items || [];

  if (items.length === 0 && !editing) {
    return (
      <div style={{
        fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink-light)',
        letterSpacing: '0.1em', border: '1px dashed oklch(28% 0.01 60)',
        padding: '40px', textAlign: 'center', borderRadius: '2px'
      }}>{content.press.empty}</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'flex-start' }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display: 'flex', gap: '18px', alignItems: 'baseline', width: '100%',
          padding: '16px 18px', border: '1px solid oklch(24% 0.01 60)', borderRadius: '2px'
        }}>
          <T path={`press.items.${i}.date`} style={{
            fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.15em',
            color: 'var(--ink-light)', textTransform: 'uppercase', minWidth: '80px'
          }} />
          <div style={{ flex: 1 }}>
            <T path={`press.items.${i}.title`} style={{
              fontFamily: 'var(--serif)', fontSize: '19px', color: 'var(--ink)', lineHeight: 1.25
            }} />
            <T path={`press.items.${i}.outlet`} style={{
              fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-mid)',
              letterSpacing: '0.08em', marginTop: '4px'
            }} />
          </div>
          {editing ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button onClick={() => {
                const p = prompt('Link URL', it.url || '');
                if (p != null) update(`press.items.${i}.url`, p.trim());
              }} style={ekBtn}>url</button>
              <EkIconBtn title="Delete" onClick={() => listRemove('press.items', i)}>×</EkIconBtn>
            </div>
          ) : it.url ? (
            <a href={it.url} target="_blank" rel="noopener noreferrer" style={{
              fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--accent)',
              letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none'
            }}>↗ read</a>
          ) : null}
        </div>
      ))}
      {editing && (
        <EkAddBtn onClick={() => listAdd('press.items', { date: '2026', title: 'Headline', outlet: 'Outlet name', url: '' })}>+ add press item</EkAddBtn>
      )}
    </div>
  );
}

// ─── ABOUT ────────────────────────────────────────────────────────────────────
function AboutBlock() {
  const { content, editing, listAdd, listRemove } = useEdit();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px', alignItems: 'start' }}>
      <EditableImg
        path="about.photo"
        alt="Portrait"
        style={{ width: '100%', objectFit: 'contain', filter: 'contrast(1.03)', borderRadius: '1px', display: 'block' }} />

      <div>
        <T path="about.heading" as="h2" style={{
          fontFamily: 'var(--serif)', fontSize: '36px', fontWeight: 400,
          lineHeight: 1.1, marginBottom: '24px', color: 'var(--ink)'
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
          {(content.about.paragraphs || []).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', width: '100%', alignItems: 'flex-start' }}>
              <T path={`about.paragraphs.${i}`} as="p" multiline style={{
                fontFamily: 'var(--sans)', fontSize: '15px', lineHeight: 1.75,
                color: 'var(--ink-mid)', flex: 1
              }} />
              {editing && <EkIconBtn title="Delete paragraph" onClick={() => listRemove('about.paragraphs', i)}>×</EkIconBtn>}
            </div>
          ))}
          {editing && <EkAddBtn onClick={() => listAdd('about.paragraphs', 'New paragraph.')}>+ add paragraph</EkAddBtn>}
        </div>
      </div>
    </div>
  );
}

// ─── CONTACT ──────────────────────────────────────────────────────────────────
function ContactBlock() {
  const { content, editing, update, listAdd, listRemove } = useEdit();
  const c = content.contact;
  const boxStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '16px',
    textDecoration: 'none', fontFamily: 'var(--mono)', fontSize: '14px',
    color: 'var(--ink)', padding: '16px 20px',
    border: '1px solid oklch(28% 0.01 60)', borderRadius: '2px',
    width: 'fit-content', transition: 'border-color 0.2s, color 0.2s'
  };
  const hoverIn = (e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; };
  const hoverOut = (e) => { e.currentTarget.style.borderColor = 'oklch(28% 0.01 60)'; e.currentTarget.style.color = 'var(--ink)'; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
      {editing ? (
        <div style={boxStyle}>
          <span style={{ fontSize: '16px' }}>✉</span>
          <T path="contact.email" style={{ display: 'inline-block' }} />
        </div>
      ) : (
        <a href={`mailto:${c.email}`} style={boxStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
          <span style={{ fontSize: '16px' }}>✉</span>
          {c.email}
        </a>
      )}

      {(c.links || []).map((l, i) => (
        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {editing ? (
            <>
              <div style={boxStyle}>
                <span style={{ fontSize: '13px' }}>↗</span>
                <T path={`contact.links.${i}.label`} style={{ display: 'inline-block' }} />
              </div>
              <button onClick={() => {
                const p = prompt('URL', l.url || '');
                if (p != null) update(`contact.links.${i}.url`, p.trim());
              }} style={ekBtn}>url</button>
              <EkIconBtn title="Delete" onClick={() => listRemove('contact.links', i)}>×</EkIconBtn>
            </>
          ) : (
            <a href={l.url} target="_blank" rel="noopener noreferrer" style={boxStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              <span style={{ fontSize: '13px' }}>↗</span>
              {l.label}
            </a>
          )}
        </div>
      ))}

      {editing && <EkAddBtn onClick={() => listAdd('contact.links', { label: 'Google Scholar', url: '' })}>+ add link</EkAddBtn>}

      <T path="contact.note" as="p" multiline style={{
        fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--ink-light)', marginTop: '8px'
      }} />
    </div>
  );
}

// ─── INNER PAGE ───────────────────────────────────────────────────────────────
export function InnerPage({ onBack }) {
  const { content } = useEdit();
  const sections = content.sections;
  const [active, setActive] = useState(sections[0]);
  const containerRef = useRef(null);

  const scrollTo = (id) => {
    setActive(id);
    const el = document.getElementById(id);
    if (el && containerRef.current) {
      containerRef.current.scrollTo({ top: el.offsetTop - 56, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = () => {
      for (const id of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom > 100) { setActive(id); break; }
      }
    };
    container.addEventListener('scroll', handler, { passive: true });
    return () => container.removeEventListener('scroll', handler);
  }, [sections]);

  const body = {
    research: <ResearchBoard />,
    press: <PressList />,
    about: <AboutBlock />,
    contact: <ContactBlock />
  };
  const labelPath = {
    research: 'research.label', press: 'press.label',
    about: 'about.label', contact: 'contact.label'
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav onBack={onBack} active={active} setActive={scrollTo} links={sections} />
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', paddingTop: '56px' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 40px 120px' }}>
          {sections.map((id, i) => (
            <Section key={id} id={id} style={i === sections.length - 1 ? { borderBottom: 'none' } : undefined}>
              <SectionLabel path={labelPath[id]} index={i} count={sections.length} />
              {body[id]}
            </Section>
          ))}
        </div>
      </div>
    </div>
  );
}
