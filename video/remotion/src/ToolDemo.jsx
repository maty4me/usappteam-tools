import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const BRAND = {
  bg: '#F6F7F9',
  ink: '#17202B',
  slate: '#425061',
  azure: '#2380B8',
  cyan: '#2E9BC7',
  berry: '#A83268',
  card: '#FFFFFF',
  grad: 'linear-gradient(120deg,#2E9BC7,#2380B8 45%,#A83268)',
  disp: "'Space Grotesk', 'Segoe UI', system-ui, sans-serif",
  body: "'Inter', 'Segoe UI', system-ui, sans-serif",
};

const ease = (f, from, to, a, b) =>
  interpolate(f, [from, to], [a, b], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/* ---------- intro title card ---------- */

const IntroCard = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  const out = ease(frame, 42, 54, 1, 0);

  return (
    <AbsoluteFill
      style={{
        background: BRAND.bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: out,
      }}
    >
      <div style={{ transform: `scale(${0.94 + s * 0.06})`, textAlign: 'center', padding: 60 }}>
        <div
          style={{
            fontFamily: BRAND.body,
            fontSize: 20,
            letterSpacing: 6,
            color: BRAND.azure,
            fontWeight: 700,
            marginBottom: 22,
            opacity: ease(frame, 0, 12, 0, 1),
          }}
        >
          FREE TOOL
        </div>
        <div
          style={{
            fontFamily: BRAND.disp,
            fontSize: 62,
            fontWeight: 700,
            color: BRAND.ink,
            lineHeight: 1.1,
            maxWidth: 960,
            opacity: ease(frame, 6, 20, 0, 1),
            transform: `translateY(${ease(frame, 6, 20, 16, 0)}px)`,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: BRAND.body,
            fontSize: 26,
            color: BRAND.slate,
            opacity: ease(frame, 16, 28, 0, 1),
          }}
        >
          tools.usappteam.com
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- step badge ---------- */

const StepBadge = ({ index, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const out = ease(frame, 62, 74, 1, 0);

  return (
    <div
      style={{
        position: 'absolute',
        left: 44,
        top: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 22px 13px 14px',
        borderRadius: 999,
        background: 'rgba(255,255,255,.95)',
        boxShadow: '0 10px 30px -8px rgba(23,32,43,.28)',
        border: '1px solid rgba(35,128,184,.2)',
        transform: `translateX(${(1 - s) * -40}px)`,
        opacity: Math.min(s, out),
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: BRAND.grad,
          color: '#fff',
          fontFamily: BRAND.disp,
          fontWeight: 700,
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <span style={{ fontFamily: BRAND.disp, fontWeight: 600, fontSize: 21, color: BRAND.ink }}>
        {label}
      </span>
    </div>
  );
};

/* ---------- captions ---------- */

const Captions = ({ lines, timeSec }) => {
  const line = lines.find((l) => timeSec >= l.start - 0.12 && timeSec <= l.end + 0.35);
  if (!line) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 46,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 60px',
      }}
    >
      <div
        style={{
          fontFamily: BRAND.body,
          fontWeight: 600,
          fontSize: 30,
          lineHeight: 1.32,
          color: BRAND.ink,
          background: 'rgba(255,255,255,.94)',
          padding: '13px 26px',
          borderRadius: 16,
          boxShadow: '0 10px 30px -10px rgba(23,32,43,.35)',
          textAlign: 'center',
          maxWidth: 880,
        }}
      >
        {line.text}
      </div>
    </div>
  );
};

/* ---------- end card ---------- */

const EndCard = ({ slug }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: BRAND.bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: ease(frame, 0, 8, 0, 1),
      }}
    >
      <div style={{ textAlign: 'center', transform: `translateY(${(1 - s) * 20}px)` }}>
        <Img
          src={staticFile('logo-A-512.png')}
          style={{ width: 88, height: 88, marginBottom: 24 }}
        />
        <div style={{ fontFamily: BRAND.disp, fontSize: 46, fontWeight: 700, color: BRAND.ink }}>
          Free to use, right now
        </div>
        <div
          style={{
            fontFamily: BRAND.body,
            fontSize: 27,
            color: BRAND.slate,
            marginTop: 14,
          }}
        >
          tools.usappteam.com/tools/{slug}
        </div>
        <div
          style={{
            display: 'inline-block',
            marginTop: 36,
            padding: '19px 42px',
            borderRadius: 999,
            background: BRAND.grad,
            color: '#fff',
            fontFamily: BRAND.disp,
            fontWeight: 700,
            fontSize: 26,
            boxShadow: '0 14px 34px -10px rgba(35,128,184,.6)',
            opacity: ease(frame, 10, 22, 0, 1),
          }}
        >
          Want a custom app? Start your app brief →
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- composition ---------- */

export const ToolDemo = ({
  slug,
  title,
  captions = { lines: [], duration: 0 },
  scenes = [],
  hasVoiceover,
  music,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const timeSec = frame / fps;

  const INTRO = Math.round(fps * 1.9);
  const OUTRO = Math.round(fps * 3.2);
  const bodyStart = INTRO;
  const bodyEnd = durationInFrames - OUTRO;
  const bodyLen = Math.max(1, bodyEnd - bodyStart);

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* screen recording */}
      <Sequence from={bodyStart} durationInFrames={bodyLen}>
        <AbsoluteFill style={{ background: BRAND.bg }}>
          <OffthreadVideo
            src={staticFile(`rec/${slug}/screen.webm`)}
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </AbsoluteFill>
      </Sequence>

      {/* step badges */}
      {scenes.map((sc, i) => {
        const from = bodyStart + Math.round((sc.at || 0) * fps);
        const len = Math.round(fps * 2.6);
        if (from >= bodyEnd) return null;
        return (
          <Sequence key={`${sc.label}-${i}`} from={from} durationInFrames={len}>
            <StepBadge index={i} label={sc.label} />
          </Sequence>
        );
      })}

      {/* captions ride over the body only */}
      <Sequence from={bodyStart} durationInFrames={bodyLen}>
        <AbsoluteFill>
          <Captions lines={captions.lines} timeSec={timeSec} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={0} durationInFrames={INTRO + 6}>
        <IntroCard title={title} />
      </Sequence>

      <Sequence from={bodyEnd} durationInFrames={OUTRO}>
        <EndCard slug={slug} />
      </Sequence>

      {/* audio: voiceover at full level, music ducked underneath */}
      {hasVoiceover ? (
        <Sequence from={bodyStart}>
          <Audio src={staticFile(`rec/${slug}/vo.mp3`)} />
        </Sequence>
      ) : null}
      {music ? (
        <Audio
          src={staticFile(music)}
          loop
          volume={(f) => {
            const fadeIn = interpolate(f, [0, fps], [0, 1], { extrapolateRight: 'clamp' });
            const fadeOut = interpolate(
              f,
              [durationInFrames - fps * 1.2, durationInFrames],
              [1, 0],
              { extrapolateLeft: 'clamp' }
            );
            // Duck hard under narration, come up for the intro and end card.
            const underVoice = f > bodyStart && f < bodyEnd;
            return Math.min(fadeIn, fadeOut) * (underVoice ? 0.13 : 0.34);
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
