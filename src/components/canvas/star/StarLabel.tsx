'use client';

import React from 'react';
import { Billboard, Text } from '@react-three/drei';
import { MusicNode, StarVisualMetrics } from '../../../types/music';

export interface StarLabelProps {
  node: MusicNode;
  metrics: StarVisualMetrics;
  isSelected: boolean;
  isHovered: boolean;
  isPlayingNode: boolean;
  shouldShowLabel: boolean;
}

/**
 * Native WebGL SDF Billboard text label with intelligent LOD visibility.
 * Zero DOM nodes, 60 FPS GPU-rendered, completely eliminates React 19 removeChild collision.
 */
export const StarLabel: React.FC<StarLabelProps> = ({
  node,
  metrics,
  isSelected,
  isHovered,
  isPlayingNode,
  shouldShowLabel,
}) => {
  if (!shouldShowLabel) return null;

  const nodeLabel = 'name' in node ? node.name : node.title;
  const affinityPct = Math.round(node.affinity * 100);
  const songCount = 'songCount' in node ? node.songCount : 1;

  const yOffset =
    metrics.coronaRadius +
    (node.type === 'genre' ? 0.90 : node.type === 'artist' ? 0.45 : 0.28);

  const primaryFontSize =
    node.type === 'genre' ? 0.65 : node.type === 'artist' ? 0.36 : 0.22;

  const primaryColor =
    isSelected || isPlayingNode ? '#CCFF00' : isHovered ? '#00F5D4' : '#F2F4F8';

  const outlineWidth =
    node.type === 'genre' ? 0.08 : node.type === 'artist' ? 0.052 : 0.036;

  const subTextFontSize =
    node.type === 'genre' ? 0.30 : node.type === 'artist' ? 0.20 : 0.15;

  let subLabelContent: string;
  if (isPlayingNode) {
    subLabelContent = `▶ EN REPRODUCCIÓN · ${affinityPct}%`;
  } else if (node.type === 'song') {
    if (node.duration) {
      const minutes = Math.floor(node.duration / 60);
      const seconds = Math.floor(node.duration % 60).toString().padStart(2, '0');
      subLabelContent = `${minutes}:${seconds} · ${affinityPct}%`;
    } else {
      subLabelContent = `${affinityPct}%`;
    }
  } else {
    subLabelContent = `${songCount}p · ${affinityPct}%`;
  }

  return (
    <Billboard
      position={[0, yOffset, 0]}
      follow={true}
      lockX={false}
      lockY={false}
      lockZ={false}
    >
      <Text
        fontSize={primaryFontSize}
        color={primaryColor}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={outlineWidth}
        outlineColor="#020205"
        outlineOpacity={1.0}
        renderOrder={99}
        depthOffset={-1}
        letterSpacing={0.02}
        maxWidth={node.type === 'song' ? 3.5 : 5.0}
        textAlign="center"
      >
        {nodeLabel}
      </Text>
      <Text
        position={[0, -0.05, 0]}
        fontSize={subTextFontSize}
        color={isSelected || isPlayingNode ? '#CCFF00' : '#00F5D4'}
        anchorX="center"
        anchorY="top"
        outlineWidth={0.035}
        outlineColor="#020205"
        outlineOpacity={1.0}
        renderOrder={99}
        depthOffset={-1}
      >
        {subLabelContent}
      </Text>
    </Billboard>
  );
};
