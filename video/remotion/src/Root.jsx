import React from 'react';
import { Composition, staticFile } from 'remotion';
import { ToolDemo } from './ToolDemo.jsx';

const FPS = 30;

/* Props come in from the render command via --props; these defaults just let the
   Studio open without a recorded tool sitting in public/. */
const defaults = {
  slug: 'app-cost-calculator',
  title: 'App Development Cost Calculator',
  durationInSeconds: 60,
  captions: { lines: [], words: [], duration: 60 },
  scenes: [],
  hasVoiceover: false,
  hasAvatarVideo: false,
  music: 'music/bed-1.mp3',
};

export const RemotionRoot = () => (
  <Composition
    id="ToolDemo"
    component={ToolDemo}
    durationInFrames={Math.round(defaults.durationInSeconds * FPS)}
    fps={FPS}
    width={1280}
    height={720}
    defaultProps={defaults}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(
        FPS * 10,
        Math.round(((props.durationInSeconds || 60) + 3.2) * FPS)
      ),
      fps: FPS,
    })}
  />
);
