// ─── HOMEPAGE: crumple-and-throw photo + name ────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { useEdit, EditableImg, T } from '../context/EditContext.jsx';

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
    }} />
  );
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
    img.onload = () => { imgRef.current = img; draw(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => { draw(); }, [progress, width, height]);

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

  useEffect(() => () => { if (animRef.current) clearTimeout(animRef.current); }, []);

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
          cursor: editing ? 'default' : isCrumpled ? (dragging ? 'grabbing' : 'grab') : isCrumpling ? 'default' : 'pointer',
          userSelect: 'none', touchAction: 'none',
          opacity: thrown ? 0 : 1, transformOrigin: 'center center'
        }}>

        {filmBorder && crumpleProgress < 0.5 && (
          <div style={{
            position: 'absolute', inset: '-16px -8px',
            background: 'oklch(15% 0 0)', borderRadius: '2px', zIndex: 0,
            boxShadow: '0 8px 40px oklch(0% 0 0 / 0.5)',
            opacity: 1 - crumpleProgress * 2
          }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={`t${i}`} style={{
                position: 'absolute', top: '4px', left: `calc(${i * 12.5}% + 6px)`,
                width: '10px', height: '7px', borderRadius: '2px', background: 'oklch(18% 0 0)'
              }} />
            ))}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={`b${i}`} style={{
                position: 'absolute', bottom: '4px', left: `calc(${i * 12.5}% + 6px)`,
                width: '10px', height: '7px', borderRadius: '2px', background: 'oklch(18% 0 0)'
              }} />
            ))}
          </div>
        )}

        {crumple !== 'idle' ? (
          <CrumpleCanvas
            src={photo}
            width={imgSize.w}
            height={imgSize.h}
            progress={crumpleProgress}
            style={{ position: 'relative', zIndex: 1 }} />
        ) : (
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
        )}

        {filmBorder && crumpleProgress < 0.5 && (
          <div style={{
            position: 'absolute', bottom: '18px', right: '12px', zIndex: 2,
            fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.15em',
            color: 'oklch(65% 0.08 80)', userSelect: 'none',
            opacity: 1 - crumpleProgress * 3
          }}>26 ▶ YJ</div>
        )}
      </div>

      {!isCrumpled && (
        <div style={{
          fontFamily: 'var(--mono)', letterSpacing: '0.18em', textTransform: 'uppercase',
          transition: 'color 0.4s', display: 'flex', alignItems: 'center', gap: '8px',
          minHeight: '20px', fontSize: '13px', color: 'rgb(255, 255, 255)'
        }}>
          {crumple === 'idle' && <><span style={{ fontSize: '14px' }}>✦</span> <T path="home.hint" /></>}
          {isCrumpling && <><span style={{ fontSize: '14px', display: 'inline-block', animation: 'spin 0.4s steps(6) infinite' }}>◌</span> {content.home.hintCrumpling}</>}
        </div>
      )}
      {isCrumpled && (
        <div style={{
          fontFamily: 'var(--serif)', fontSize: '44px', fontWeight: 400,
          letterSpacing: '-0.01em', color: 'var(--accent)', textAlign: 'center',
          lineHeight: 1, display: 'flex', alignItems: 'center', gap: '14px',
          animation: 'pulseScale 1.4s ease-in-out infinite'
        }}>
          <span style={{ fontSize: '34px' }}>↔</span>
          {content.home.hintThrow}
        </div>
      )}
    </div>
  );
}

// ─── HOMEPAGE ────────────────────────────────────────────────────────────────
export function HomePage({ onEnter, tweaks }) {
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
    </div>
  );
}
