'use client';

import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { getNebulaLayout, NebulaRelation } from '../../../lib/layout/nebulaLayout';
import { collisionBadge, visibleCollisionMarkers } from '../../../lib/layout/collisionModel';

const RECHECK_SECONDS = 0.25;

/**
 * "∩ n" markers at collision contact points (Nebulosas v3 · M7.4), SDF billboards like StarLabel.
 * Shows the 4 nearest in the galaxy view, the focused genre's in node views and the selected one
 * in collision view; clicking selects the collision (drags > 4 px are ignored, as for stars).
 */
export const CollisionMarkers: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const baseData = useGalaxyStore((s) => s.baseData);
  const selectCollision = useGalaxyStore((s) => s.selectCollision);
  const layout = useMemo(() => getNebulaLayout(baseData), [baseData]);
  const [visibleKeys, setVisibleKeys] = useState<string>('');
  const elapsed = useRef(RECHECK_SECONDS);
  const cameraLocal = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    elapsed.current += delta;
    const parent = groupRef.current?.parent;
    if (elapsed.current < RECHECK_SECONDS || !parent) return;
    elapsed.current = 0;
    const state = useGalaxyStore.getState();
    // camera in the rotating cosmos group's space, where contact points live
    parent.worldToLocal(cameraLocal.current.copy(camera.position));
    const keys = visibleCollisionMarkers(
      layout.relations,
      [cameraLocal.current.x, cameraLocal.current.y, cameraLocal.current.z],
      state.cameraMode,
      state.selectedSectorId,
      state.selectedCollision
    )
      .map((r) => `${r.a}|${r.b}`)
      .join(',');
    if (keys !== visibleKeys) setVisibleKeys(keys);
  });

  const visible = useMemo(() => {
    const keys = new Set(visibleKeys.split(','));
    return layout.relations.filter((r) => keys.has(`${r.a}|${r.b}`));
  }, [layout, visibleKeys]);

  const handleClick = (relation: NebulaRelation) => (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 4) return; // orbit drag, not a click
    event.stopPropagation();
    selectCollision({ a: relation.a, b: relation.b });
  };

  return (
    <group ref={groupRef} name="nebula-collision-markers">
      {visible.map((r) => (
        <Billboard
          key={`${r.a}|${r.b}`}
          position={[r.contact[0], r.contact[1] + r.radius * 0.55, r.contact[2]]}
          follow
          lockX={false}
          lockY={false}
          lockZ={false}
        >
          <Text
            fontSize={0.62}
            color="#CCFF00"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#020205"
            outlineOpacity={1}
            renderOrder={99}
            depthOffset={-1}
            onClick={handleClick(r)}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = '')}
          >
            {collisionBadge(r.sharedSongs)}
          </Text>
        </Billboard>
      ))}
    </group>
  );
};
