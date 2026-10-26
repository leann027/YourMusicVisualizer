'use client';

export {
  StarNodeMesh,
  StarCoreMesh,
  StarAccretionRings,
  StarFeatures,
  StarPlaybackPulsar,
  StarLabel,
  UNIT_SPHERE_GEOMETRY,
  UNIT_RING_GEOMETRY,
  UNIT_OUTER_RING_GEOMETRY,
  UNIT_RIPPLE_GEOMETRY,
  UNIT_POLAR_JET_GEOMETRY,
  UNIT_SATELLITE_GEOMETRY,
  UNIT_DIFFRACTION_GEOMETRY,
  disposeStarGeometries,
  softRingOnBeforeCompile,
  starCoreOnBeforeCompile,
  softRingCustomProgramCacheKey,
  starCoreCustomProgramCacheKey,
  SOFT_RING_PROGRAM_CACHE_KEY,
  STAR_CORE_PROGRAM_CACHE_KEY,
} from './star';

export type {
  StarNodeMeshProps,
  GalaxyNode,
  StarCoreMeshProps,
  StarAccretionRingsProps,
  StarFeaturesProps,
  StarPlaybackPulsarProps,
  StarLabelProps,
} from './star';

export * from './star';
