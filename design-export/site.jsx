const { useState, useEffect, useRef } = React;

// ─── TWEAK DEFAULTS ──────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#35a207",
  "bgColor": "oklch(8% 0.01 60)",
  "showFilmBorder": true,
  "nameSize": 88
} /*EDITMODE-END*/;

// ─── CURSOR BLINK ─────────────────────────────────────────────────────────────
function BlinkingCursor() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setVisible((v) => !v), 530);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{
      display: 'inline-block', width: '3px', height: '0.75em',
      background: 'var(--accent)', verticalAlign: 'middle', marginLeft: '4px',
      opacity: visible ? 1 : 0, transition: 'opacity 0.05s'
    }} />);

}

// ─── CRUMPLE CANVAS ─────────────────────────────────────────────────────────
function CrumpleCanvas({ src, width, height, progress, style }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const seeds = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      offsetX: Math.sin(i * 7.3 + 1.1) * 0.5 + 0.5,
      offsetY: Math.sin(i * 3.7 + 2.4) * 0.5 + 0.5,
      freq1: 2 + Math.abs(Math.sin(i * 1.7)) * 6,
      freq2: 1.5 + Math.abs(Math.cos(i * 2.3)) * 5,
      amp1: Math.abs(Math.sin(i * 5.1)) * 0.6 + 0.2,
      amp2: Math.abs(Math.cos(i * 4.2)) * 0.5 + 0.2,
      twist: Math.sin(i * 8.1) * 0.5
    }))
  );

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {imgRef.current = img;draw();};
  }, [src]);

  useEffect(() => {draw();}, [progress, width, height]);

  const draw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (progress <= 0) {
      ctx.drawImage(img, 0, 0, W, H);
      return;
    }

    const frameCount = 14;
    const frame = Math.floor(progress * frameCount);
    const s = seeds.current[frame % seeds.current.length];
    const p = progress;

    const gridX = Math.max(4, Math.round(18 * (1 - p * 0.6)));
    const gridY = Math.max(4, Math.round(22 * (1 - p * 0.6)));
    const cellW = W / gridX;
    const cellH = H / gridY;

    for (let gy = 0; gy < gridY; gy++) {
      for (let gx = 0; gx < gridX; gx++) {
        const nx = gx / gridX;
        const ny = gy / gridY;

        const fold1 = Math.sin(nx * s.freq1 * Math.PI + s.offsetX * Math.PI * 2 + frame * 0.8) * p * s.amp1;
        const fold2 = Math.cos(ny * s.freq2 * Math.PI + s.offsetY * Math.PI * 2 + frame * 0.6) * p * s.amp2;
        const twist = Math.sin((nx + ny) * 4 + frame * 0.4) * p * s.twist * 0.5;

        const dx = (fold1 + twist) * cellW * 2.5;
        const dy = (fold2 + twist) * cellH * 2.5;

        const srcX = gx / gridX * img.width;
        const srcY = gy / gridY * img.height;
        const srcW = img.width / gridX;
        const srcH = img.height / gridY;

        const dstX = gx * cellW + dx;
        const dstY = gy * cellH + dy;
        const dstW = cellW + Math.abs(dx) * 0.2;
        const dstH = cellH + Math.abs(dy) * 0.2;

        ctx.save();
        ctx.globalAlpha = 1 - Math.min(0.85, p * Math.abs(fold1 + fold2) * 1.8);
        ctx.drawImage(img, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);
        ctx.restore();

        if (p > 0.2 && Math.abs(fold1 + fold2) > 0.3) {
          ctx.save();
          ctx.fillStyle = `oklch(0% 0 0 / ${Math.min(0.6, p * Math.abs(fold1 + fold2) * 0.9)})`;
          ctx.fillRect(dstX, dstY, dstW * 0.5, dstH);
          ctx.restore();
        }
      }
    }

    ctx.fillStyle = `oklch(0% 0 0 / ${p * 0.4})`;
    ctx.fillRect(0, 0, W, H);
  };

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block', ...style }} />;
}

// ─── DRAGGABLE PHOTO ─────────────────────────────────────────────────────────
function DraggablePhoto({ onThrow, filmBorder }) {
  const { content, editing } = useEdit();
  const photo = content.home.photo;
  const ref = useRef(null);
  const dragState = useRef(null);
  const animRef = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [rot, setRot] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [thrown, setThrown] = useState(false);
  const [crumple, setCrumple] = useState('idle');
  const [crumpleProgress, setCrumpleProgress] = useState(0);
  const [imgSize, setImgSize] = useState({ w: 320, h: 480 });

  const onImgLoad = (e) => {
    const maxH = Math.min(520, window.innerHeight * 0.55);
    const ratio = e.target.naturalWidth / e.target.naturalHeight;
    setImgSize({ w: Math.round(maxH * ratio), h: maxH });
  };

  const animateCrumple = () => {
    const totalFrames = 10;
    const frameInterval = 90;
    let frame = 0;
    const step = () => {
      frame++;
      const t = frame / totalFrames;
      setCrumpleProgress(t * t * (3 - 2 * t));
      if (frame < totalFrames) {
        animRef.current = setTimeout(step, frameInterval);
      } else {
        setCrumpleProgress(1);
        setCrumple('crumpled');
      }
    };
    animRef.current = setTimeout(step, frameInterval);
  };

  useEffect(() => () => {if (animRef.current) clearTimeout(animRef.current);}, []);

  const handleClick = () => {
    if (editing || crumple !== 'idle') return;
    setCrumple('crumpling');
    animateCrumple();
  };

  const onPointerDown = (e) => {
    if (editing || crumple !== 'crumpled') return;
    e.preventDefault();
    setDragging(true);
    dragState.current = {
      startX: e.clientX - pos.x, startY: e.clientY - pos.y,
      lastX: e.clientX, lastY: e.clientY,
      velX: 0, velY: 0, lastTime: Date.now()
    };
    ref.current.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragState.current) return;
    const now = Date.now();
    const dt = Math.max(now - dragState.current.lastTime, 1);
    const newX = e.clientX - dragState.current.startX;
    const newY = e.clientY - dragState.current.startY;
    dragState.current.velX = (e.clientX - dragState.current.lastX) / dt * 16;
    dragState.current.velY = (e.clientY - dragState.current.lastY) / dt * 16;
    dragState.current.lastX = e.clientX;
    dragState.current.lastY = e.clientY;
    dragState.current.lastTime = now;
    setPos({ x: newX, y: newY });
    setRot(dragState.current.velX * 1.2);
  };

  const onPointerUp = () => {
    if (!dragState.current) return;
    const { velX, velY } = dragState.current;
    const speed = Math.sqrt(velX * velX + velY * velY);
    setDragging(false);
    dragState.current = null;
    if (speed > 6) {
      setThrown(true);
      const dir = velX > 0 ? 1 : -1;
      setPos({ x: velX * 90, y: velY * 50 });
      setRot(dir * 50);
      setTimeout(() => onThrow(), 450);
    } else {
      setPos({ x: 0, y: 0 });
      setRot(0);
    }
  };

  const isCrumpled = crumple === 'crumpled';
  const isCrumpling = crumple === 'crumpling';
  const scaleDown = 1 - crumpleProgress * 0.42;

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <div
        ref={ref}
        onClick={!isCrumpled && !isCrumpling ? handleClick : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'relative',
          transform: `translate(${pos.x}px, ${pos.y}px) rotate(${rot + (dragging ? 0 : isCrumpled ? 3 : -2)}deg) scale(${scaleDown})`,
          transition: dragging || thrown || isCrumpling ? 'none' : 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          cursor: editing ? 'default' : isCrumpled ? dragging ? 'grabbing' : 'grab' : isCrumpling ? 'default' : 'pointer',
          userSelect: 'none', touchAction: 'none',
          opacity: thrown ? 0 : 1, transformOrigin: 'center center'
        }}>

        {filmBorder && crumpleProgress < 0.5 &&
        <div style={{
          position: 'absolute', inset: '-16px -8px',
          background: 'oklch(15% 0 0)', borderRadius: '2px', zIndex: 0,
          boxShadow: '0 8px 40px oklch(0% 0 0 / 0.5)',
          opacity: 1 - crumpleProgress * 2
        }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
          <div key={`t${i}`} style={{
            position: 'absolute', top: '4px', left: `calc(${i * 12.5}% + 6px)`,
            width: '10px', height: '7px', borderRadius: '2px', background: 'oklch(18% 0 0)'
          }} />
          )}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
          <div key={`b${i}`} style={{
            position: 'absolute', bottom: '4px', left: `calc(${i * 12.5}% + 6px)`,
            width: '10px', height: '7px', borderRadius: '2px', background: 'oklch(18% 0 0)'
          }} />
          )}
          </div>
        }

        {crumple !== 'idle' ?
        <CrumpleCanvas
          src={photo}
          width={imgSize.w}
          height={imgSize.h}
          progress={crumpleProgress}
          style={{ position: 'relative', zIndex: 1 }} /> :


        <EditableImg
          path="home.photo"
          alt={content.home.nameFirst}
          draggable={false}
          onLoad={onImgLoad}
          wrapStyle={{ position: 'relative', zIndex: 1 }}
          style={{
            position: 'relative', zIndex: 1, display: 'block',
            width: 'auto', maxWidth: '100%',
            height: 'min(520px, 50vw, 62vh)',
            objectFit: 'contain', filter: 'contrast(1.03)'
          }} />

        }

        {filmBorder && crumpleProgress < 0.5 &&
        <div style={{
          position: 'absolute', bottom: '18px', right: '12px', zIndex: 2,
          fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.15em',
          color: 'oklch(65% 0.08 80)', userSelect: 'none',
          opacity: 1 - crumpleProgress * 3
        }}>26 ▶ YJ</div>
        }
      </div>

      {!isCrumpled &&
      <div style={{
        fontFamily: 'var(--mono)', letterSpacing: '0.18em', textTransform: 'uppercase',
        transition: 'color 0.4s', display: 'flex', alignItems: 'center', gap: '8px',
        minHeight: '20px', fontSize: '13px', color: 'rgb(255, 255, 255)'
      }}>
          {crumple === 'idle' && <><span style={{ fontSize: '14px' }}>✦</span> <T path="home.hint" /></>}
          {isCrumpling && <><span style={{ fontSize: '14px', display: 'inline-block', animation: 'spin 0.4s steps(6) infinite' }}>◌</span> {content.home.hintCrumpling}</>}
        </div>
      }
      {isCrumpled &&
      <div style={{
        fontFamily: 'var(--serif)', fontSize: '44px', fontWeight: 400,
        letterSpacing: '-0.01em', color: 'var(--accent)', textAlign: 'center',
        lineHeight: 1, display: 'flex', alignItems: 'center', gap: '14px',
        animation: 'pulseScale 1.4s ease-in-out infinite'
      }}>
          <span style={{ fontSize: '34px' }}>↔</span>
          {content.home.hintThrow}
        </div>
      }

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseScale { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      `}</style>
    </div>);

}

// ─── HOMEPAGE ────────────────────────────────────────────────────────────────
function HomePage({ onEnter, tweaks }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: loaded ? 1 : 0, transition: 'opacity 0.7s ease'
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        width: '100%', height: '100%', maxWidth: '1400px', margin: '0 auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
          <DraggablePhoto onThrow={onEnter} filmBorder={tweaks.showFilmBorder} />
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '60px 60px 60px 20px'
        }}>
          <h1 style={{
            fontFamily: 'var(--serif)', fontSize: `${tweaks.nameSize}px`,
            lineHeight: 0.92, color: 'var(--ink)', fontWeight: 400,
            letterSpacing: '-0.01em', marginBottom: '20px'
          }}>
            <T path="home.nameFirst" style={{ color: 'var(--accent)', display: 'block' }} />
            <span style={{ fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
              <T path="home.nameLast" />
              <BlinkingCursor />
            </span>
          </h1>

          <div style={{ width: '40px', height: '2px', background: 'var(--accent)', borderRadius: '1px', marginBottom: '20px' }} />

          <T path="home.line1" style={{
            fontFamily: 'var(--mono)', fontSize: '13px',
            color: 'var(--ink-mid)', letterSpacing: '0.05em', marginBottom: '6px'
          }} />
          <T path="home.line2" style={{
            fontFamily: 'var(--sans)', fontSize: '13px',
            color: 'var(--ink-light)', marginBottom: '6px'
          }} />
          <T path="home.location" style={{
            fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.2em',
            color: 'var(--ink-light)', textTransform: 'uppercase', marginTop: '10px'
          }} />
        </div>
      </div>
    </div>);

}

// ─── VIDEO SPLASH PAGE ────────────────────────────────────────────────────────
function VideoPage({ onContinue }) {
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
    const onTime = () => {if (el.duration) setProgress(el.currentTime / el.duration);};
    const onEnded = () => {setEnded(true);setPlaying(false);};
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    const stallTimer = setTimeout(() => {if (el.readyState < 2) setVideoStalled(true);}, 5000);
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
    if (el.muted) {el.muted = false;setMuted(false);}
    if (el.paused) el.play();else el.pause();
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
        {!videoStalled &&
        <video
          ref={videoRef}
          src={v.src}
          poster={v.poster}
          autoPlay={!editing}
          playsInline
          muted={muted}
          preload="auto"
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
        }

        {videoStalled &&
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
        }

        {!videoStalled && !editing &&
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
              {muted && playing ?
            <div style={{ color: 'white', fontSize: '11px', fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}>UNMUTE</div> :

            <div style={{
              width: 0, height: 0,
              borderTop: '10px solid transparent', borderBottom: '10px solid transparent',
              borderLeft: '18px solid white', marginLeft: '4px'
            }} />
            }
            </div>
          </div>
        }

        {editing &&
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
        }

        {!videoStalled &&
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'oklch(30% 0 0)' }}>
            <div style={{ height: '100%', background: 'var(--accent)', width: `${progress * 100}%`, transition: 'width 0.3s linear' }} />
          </div>
        }
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
    </div>);

}

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
        {links.map((l) =>
        <button key={l} onClick={() => setActive(l)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--mono)', fontSize: '11px',
          letterSpacing: '0.15em', textTransform: 'uppercase',
          color: active === l ? 'var(--accent)' : 'var(--ink-light)',
          padding: '4px 0',
          borderBottom: active === l ? '1.5px solid var(--accent)' : '1.5px solid transparent',
          transition: 'color 0.2s, border-color 0.2s'
        }}>{l}</button>
        )}
      </div>
    </nav>);

}

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────
function Section({ id, children, style }) {
  return (
    <section id={id} style={{ padding: '80px 0', borderBottom: '1px solid oklch(22% 0.01 60)', ...style }}>
      {children}
    </section>);

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
      {editing &&
      <span style={{ display: 'flex', gap: '4px' }}>
          <EkIconBtn title="Move section up" onClick={() => listMove('sections', index, index - 1)} style={{ opacity: index === 0 ? 0.3 : 1 }}>↑</EkIconBtn>
          <EkIconBtn title="Move section down" onClick={() => listMove('sections', index, index + 1)} style={{ opacity: index === count - 1 ? 0.3 : 1 }}>↓</EkIconBtn>
        </span>
      }
      <div style={{ flex: 1, height: '1px', background: 'oklch(22% 0.01 60)' }} />
    </div>);

}

// ─── RESEARCH BOARD ───────────────────────────────────────────────────────────
function ResearchBoard() {
  const { content, editing, listAdd } = useEdit();
  const projects = content.projects;
  const indexed = projects.map((p, i) => ({ p, i }));
  const groups = [
  { label: 'In Progress', status: 'ongoing', accent: '#5fa05b' },
  { label: 'Upcoming', status: 'upcoming', accent: '#5081b8' },
  { label: 'Archive', status: 'completed', accent: '#999' }];


  return (
    <>
      <T path="research.hint" style={{
        fontFamily: 'var(--mono)', letterSpacing: '0.08em',
        color: 'var(--ink-light)', marginBottom: '32px', fontSize: '15px'
      }} />

      {groups.map((g) => {
        const list = indexed.filter(({ p }) =>
        g.status === 'completed' ?
        p.status === 'completed' || p.status === 'archived' || !p.status :
        p.status === g.status
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
              {list.map(({ p, i }) =>
              <StickyNote key={i} project={p} absIndex={i} rotation={NOTE_ROTATIONS[i % NOTE_ROTATIONS.length]} />
              )}
              {editing &&
              <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EkAddBtn onClick={() => listAdd('projects', { ...newNote(), status: g.status })}>+ add note</EkAddBtn>
                </div>
              }
            </div>
          </div>);

      })}
    </>);

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
      }}>{content.press.empty}</div>);

  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'flex-start' }}>
      {items.map((it, i) =>
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
          {editing ?
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button onClick={() => {
            const p = prompt('Link URL', it.url || '');
            if (p != null) update(`press.items.${i}.url`, p.trim());
          }} style={ekBtn}>url</button>
              <EkIconBtn title="Delete" onClick={() => listRemove('press.items', i)}>×</EkIconBtn>
            </div> :
        it.url ?
        <a href={it.url} target="_blank" rel="noopener noreferrer" style={{
          fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--accent)',
          letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none'
        }}>↗ read</a> : null
        }
        </div>
      )}
      {editing &&
      <EkAddBtn onClick={() => listAdd('press.items', { date: '2026', title: 'Headline', outlet: 'Outlet name', url: '' })}>+ add press item</EkAddBtn>
      }
    </div>);

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
          {(content.about.paragraphs || []).map((_, i) =>
          <div key={i} style={{ display: 'flex', gap: '10px', width: '100%', alignItems: 'flex-start' }}>
              <T path={`about.paragraphs.${i}`} as="p" multiline style={{
              fontFamily: 'var(--sans)', fontSize: '15px', lineHeight: 1.75,
              color: 'var(--ink-mid)', flex: 1
            }} />
              {editing && <EkIconBtn title="Delete paragraph" onClick={() => listRemove('about.paragraphs', i)}>×</EkIconBtn>}
            </div>
          )}
          {editing && <EkAddBtn onClick={() => listAdd('about.paragraphs', 'New paragraph.')}>+ add paragraph</EkAddBtn>}
        </div>
      </div>
    </div>);

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
  const hoverIn = (e) => {e.currentTarget.style.borderColor = 'var(--accent)';e.currentTarget.style.color = 'var(--accent)';};
  const hoverOut = (e) => {e.currentTarget.style.borderColor = 'oklch(28% 0.01 60)';e.currentTarget.style.color = 'var(--ink)';};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
      {editing ?
      <div style={boxStyle}>
          <span style={{ fontSize: '16px' }}>✉</span>
          <T path="contact.email" style={{ display: 'inline-block' }} />
        </div> :

      <a href={`mailto:${c.email}`} style={boxStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
          <span style={{ fontSize: '16px' }}>✉</span>
          {c.email}
        </a>
      }

      {(c.links || []).map((l, i) =>
      <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {editing ?
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
            </> :

        <a href={l.url} target="_blank" rel="noopener noreferrer" style={boxStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              <span style={{ fontSize: '13px' }}>↗</span>
              {l.label}
            </a>
        }
        </div>
      )}

      {editing && <EkAddBtn onClick={() => listAdd('contact.links', { label: 'Google Scholar', url: '' })}>+ add link</EkAddBtn>}

      <T path="contact.note" as="p" multiline style={{
        fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--ink-light)', marginTop: '8px'
      }} />
    </div>);

}

// ─── INNER PAGE ───────────────────────────────────────────────────────────────
function InnerPage({ onBack }) {
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
        if (rect.top <= 100 && rect.bottom > 100) {setActive(id);break;}
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
          {sections.map((id, i) =>
          <Section key={id} id={id} style={i === sections.length - 1 ? { borderBottom: 'none' } : undefined}>
              <SectionLabel path={labelPath[id]} index={i} count={sections.length} />
              {body[id]}
            </Section>
          )}
        </div>
      </div>
    </div>);

}

// ─── SITE ────────────────────────────────────────────────────────────────────
function Site() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const { editing } = useEdit();
  const [page, setPage] = useState(() => editing ? 'inner' : 'home');
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', tweaks.accentColor);
    document.documentElement.style.setProperty('--bg', tweaks.bgColor);
  }, [tweaks.accentColor, tweaks.bgColor]);

  const navigate = (to) => {
    setOpacity(0);
    setTimeout(() => {setPage(to);setOpacity(1);}, 380);
  };

  const pageBtn = (id, label) =>
  <button key={id} onClick={() => setPage(id)} style={{
    ...ekBtn,
    background: page === id ? 'oklch(100% 0 0 / 0.18)' : 'oklch(0% 0 0 / 0.5)'
  }}>{label}</button>;


  return (
    <>
      <div style={{ opacity, transition: 'opacity 0.38s ease', width: '100%', height: '100%' }}>
        {page === 'home' && <HomePage onEnter={() => navigate('video')} tweaks={tweaks} />}
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

      <TweaksPanel>
        <TweakSection label="Colors">
          <TweakColor label="Accent Color" value={tweaks.accentColor} onChange={(v) => setTweak('accentColor', v)} />
          <TweakColor label="Background" value={tweaks.bgColor} onChange={(v) => setTweak('bgColor', v)} />
        </TweakSection>
        <TweakSection label="Home">
          <TweakToggle label="Film Border" value={tweaks.showFilmBorder} onChange={(v) => setTweak('showFilmBorder', v)} />
          <TweakSlider label="Name Size" min={48} max={120} step={2} value={tweaks.nameSize} onChange={(v) => setTweak('nameSize', v)} />
        </TweakSection>
      </TweaksPanel>
    </>);

}

function App() {
  return (
    <ContentProvider>
      <Site />
    </ContentProvider>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
