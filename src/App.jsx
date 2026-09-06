import React, { useEffect, useRef, useState } from 'react';
import { ContentProvider, useEdit, EditBar, LoginGate, ekBtn } from './context/EditContext.jsx';
import { HomePage } from './components/Home.jsx';
import { VideoPage } from './components/VideoPage.jsx';
import { InnerPage } from './components/InnerPage.jsx';
import { SettingsPanel } from './components/SettingsPanel.jsx';

function LoadingScreen() {
  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
      color: 'var(--ink-light)'
    }}>loading…</div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', gap: '10px',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px',
      fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink-mid)'
    }}>
      <div style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(70% 0.18 30)' }}>Couldn't load the site</div>
      <div>{message}</div>
    </div>
  );
}

// ─── SITE ────────────────────────────────────────────────────────────────────
function Site() {
  const { editing, content } = useEdit();
  const [page, setPage] = useState('home');
  const [opacity, setOpacity] = useState(1);
  const initializedForEdit = useRef(false);

  // Jump straight to the sections view the first time edit mode unlocks,
  // without fighting subsequent manual navigation.
  useEffect(() => {
    if (editing && !initializedForEdit.current) {
      initializedForEdit.current = true;
      setPage('inner');
    }
  }, [editing]);

  const settings = content.settings || {};
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.accentColor || '#35a207');
    document.documentElement.style.setProperty('--bg', settings.bgColor || 'oklch(8% 0.01 60)');
  }, [settings.accentColor, settings.bgColor]);

  const navigate = (to) => {
    setOpacity(0);
    setTimeout(() => { setPage(to); setOpacity(1); }, 380);
  };

  const pageBtn = (id, label) => (
    <button key={id} onClick={() => setPage(id)} style={{
      ...ekBtn,
      background: page === id ? 'oklch(100% 0 0 / 0.18)' : 'oklch(0% 0 0 / 0.5)'
    }}>{label}</button>
  );

  return (
    <>
      <div style={{ opacity, transition: 'opacity 0.38s ease', width: '100%', height: '100%' }}>
        {page === 'home' && <HomePage onEnter={() => navigate('video')} tweaks={settings} />}
        {page === 'video' && <VideoPage onContinue={() => navigate('inner')} />}
        {page === 'inner' && <InnerPage onBack={() => navigate('home')} />}
      </div>

      <EditBar>
        <span style={{ width: '1px', height: '18px', background: 'oklch(30% 0.01 60)' }} />
        <span style={{ display: 'flex', gap: '4px' }}>
          {pageBtn('home', 'home')}
          {pageBtn('video', 'video')}
          {pageBtn('inner', 'sections')}
        </span>
      </EditBar>

      <SettingsPanel />
    </>
  );
}

function AppShell() {
  const { content, loadError, editRequested, authChecked, authed } = useEdit();
  if (loadError) return <ErrorScreen message={loadError} />;
  if (!content || (editRequested && !authChecked)) return <LoadingScreen />;
  if (editRequested && !authed) return <LoginGate />;
  return <Site />;
}

export default function App() {
  return (
    <ContentProvider>
      <AppShell />
    </ContentProvider>
  );
}
