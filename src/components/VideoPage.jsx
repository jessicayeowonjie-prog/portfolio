// ─── VIDEO SPLASH PAGE ────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { useEdit, ekBtn, T } from '../context/EditContext.jsx';

export function VideoPage({ onContinue }) {
  const { content, editing, update } = useEdit();
  const v = content.video;
  const videoRef = useRef(null);
  const [ended, setEnded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoStalled, setVideoStalled] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => { if (el.duration) setProgress(el.currentTime / el.duration); };
    const onEnded = () => { setEnded(true); setPlaying(false); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    const stallTimer = setTimeout(() => { if (el.readyState < 2) setVideoStalled(true); }, 5000);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      clearTimeout(stallTimer);
    };
  }, [v.src]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.muted) { el.muted = false; setMuted(false); }
    if (el.paused) el.play(); else el.pause();
  };

  return (
    <div style={{
      width: '100vw', height: '100vh', background: 'oklch(5% 0 0)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: loaded ? 1 : 0, transition: 'opacity 0.7s ease',
      padding: '40px', gap: '32px', fontFamily: 'sans-serif',
      overflowY: editing ? 'auto' : 'hidden'
    }}>
      <T path="video.heading" style={{
        fontFamily: "'Rascal', 'DM Serif Display', Georgia, serif",
        fontSize: '42px', fontWeight: 400, color: 'var(--ink)',
        textAlign: 'center', letterSpacing: '-0.2px'
      }} />
      <T path="video.kicker" multiline style={{
        fontFamily: "'Space Mono', monospace", letterSpacing: '0.3em',
        textTransform: 'uppercase', textAlign: 'center', maxWidth: '560px',
        fontSize: '13px', color: 'rgb(138, 235, 112)'
      }} />

      <div style={{
        position: 'relative', width: '100%', maxWidth: '720px',
        aspectRatio: '16/9', background: 'black',
        backgroundImage: `url(${v.poster})`, backgroundSize: 'cover', backgroundPosition: 'center',
        borderRadius: '2px', overflow: 'hidden',
        boxShadow: '0 24px 80px oklch(0% 0 0 / 0.7)',
        cursor: videoStalled || editing ? 'default' : 'pointer'
      }} onClick={videoStalled || editing ? undefined : togglePlay}>
        {!videoStalled && (
          <video
            ref={videoRef}
            src={v.src}
            poster={v.poster}
            autoPlay={!editing}
            playsInline
            muted={muted}
            preload="auto"
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
        )}

        {videoStalled && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '10px',
            background: 'oklch(0% 0 0 / 0.35)'
          }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'white', background: 'oklch(0% 0 0 / 0.55)',
              padding: '10px 18px', borderRadius: '2px', textAlign: 'center'
            }}>Video preview unavailable — continue below</div>
          </div>
        )}

        {!videoStalled && !editing && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            opacity: playing && !muted ? 0 : 0.85,
            transition: 'opacity 0.3s', pointerEvents: 'none'
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'oklch(0% 0 0 / 0.6)', border: '2px solid oklch(80% 0 0 / 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {muted && playing ? (
                <div style={{ color: 'white', fontSize: '11px', fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}>UNMUTE</div>
              ) : (
                <div style={{
                  width: 0, height: 0,
                  borderTop: '10px solid transparent', borderBottom: '10px solid transparent',
                  borderLeft: '18px solid white', marginLeft: '4px'
                }} />
              )}
            </div>
          </div>
        )}

        {editing && (
          <div style={{ position: 'absolute', bottom: '10px', left: '10px', display: 'flex', gap: '5px', zIndex: 20 }}>
            <button onClick={() => {
              const p = prompt('Video path or URL', v.src);
              if (p != null) update('video.src', p.trim());
            }} style={ekBtn}>video path</button>
            <button onClick={() => {
              const p = prompt('Poster image path or URL', v.poster);
              if (p != null) update('video.poster', p.trim());
            }} style={ekBtn}>poster path</button>
          </div>
        )}

        {!videoStalled && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'oklch(30% 0 0)' }}>
            <div style={{ height: '100%', background: 'var(--accent)', width: `${progress * 100}%`, transition: 'width 0.3s linear' }} />
          </div>
        )}
      </div>

      <T path="video.caption" multiline style={{
        fontWeight: 500, letterSpacing: '-0.005em', textAlign: 'center',
        maxWidth: '560px', lineHeight: 1.4, fontFamily: 'monospace',
        fontSize: '14px', color: 'rgb(255, 255, 255)'
      }} />

      <button
        onClick={onContinue}
        style={{
          background: 'none', border: '1px solid oklch(35% 0 0)',
          color: ended ? 'var(--accent)' : 'var(--ink-light)',
          fontFamily: 'var(--mono)', fontSize: '11px',
          letterSpacing: '0.25em', textTransform: 'uppercase',
          padding: '14px 36px', cursor: 'pointer', borderRadius: '1px',
          borderColor: ended ? 'var(--accent)' : 'oklch(35% 0 0)',
          transition: 'color 0.3s, border-color 0.3s',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--accent)';
          e.currentTarget.style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = ended ? 'var(--accent)' : 'oklch(50% 0 0)';
          e.currentTarget.style.borderColor = ended ? 'var(--accent)' : 'oklch(35% 0 0)';
        }}>
        <span>{v.button}</span>
        <span>→</span>
      </button>
    </div>
  );
}
