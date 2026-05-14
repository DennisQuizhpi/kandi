"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";

import {
  KandiBraceletStageMeshes,
  type BeadClickEvent,
} from "@/components/kandi/KandiCanvas";
import { braceletRingRadius, braceletStrandTubeRadius } from "@/lib/kandi/constants";
import { createPerforatedBeadGeometry } from "@/lib/kandi/perforatedBeadGeometry";
import { createPerforatedLabelBeadGeometry } from "@/lib/kandi/perforatedLabelBeadGeometry";
import { getRingPoints } from "@/lib/kandi/layout";
import type { Bead } from "@/lib/kandi/types";

const SHOWCASE_ENTRANCE_DURATION_S = 0.78;
const SHOWCASE_ENTRANCE_SPIN_RAD = 0.38;

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

function collectOpacityMaterials(root: THREE.Object3D): THREE.Material[] {
  const out: THREE.Material[] = [];
  const seen = new Set<string>();
  root.traverse((obj) => {
    const o = obj as { material?: THREE.Material | THREE.Material[] };
    const raw = o.material;
    if (raw === undefined) {
      return;
    }
    const list = Array.isArray(raw) ? raw : [raw];
    for (const mat of list) {
      if (!mat || typeof mat.opacity !== "number" || typeof mat.transparent !== "boolean") {
        continue;
      }
      if (seen.has(mat.uuid)) {
        continue;
      }
      seen.add(mat.uuid);
      out.push(mat);
    }
  });
  return out;
}

function restoreMaterials(
  materials: THREE.Material[],
  originalTransparentByUuid: Map<string, boolean>,
): void {
  for (const mat of materials) {
    const orig = originalTransparentByUuid.get(mat.uuid);
    mat.opacity = 1;
    if (orig !== undefined) {
      mat.transparent = orig;
    }
    mat.needsUpdate = true;
  }
}

function BraceletShowcaseEntranceMotion({ groupRef }: { groupRef: RefObject<THREE.Group | null> }) {
  const invalidate = useThree((s) => s.invalidate);
  const [reducedMotion, setReducedMotion] = useState(false);
  const startAtRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const originalTransparentByUuidRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) {
      return;
    }
    const originals = originalTransparentByUuidRef.current;
    originals.clear();

    if (reducedMotion) {
      group.scale.setScalar(1);
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      for (const mat of collectOpacityMaterials(group)) {
        mat.opacity = 1;
        mat.needsUpdate = true;
      }
      originals.clear();
      completedRef.current = true;
      return;
    }
    group.scale.setScalar(0.86);
    group.position.set(0, 0, -1.25);
    group.rotation.set(0.05, 0, -SHOWCASE_ENTRANCE_SPIN_RAD);
    startAtRef.current = null;
    completedRef.current = false;
    invalidate();
  }, [groupRef, invalidate, reducedMotion]);

  useFrame((state) => {
    if (completedRef.current || reducedMotion) {
      return;
    }
    const group = groupRef.current;
    if (!group) {
      return;
    }
    if (startAtRef.current === null) {
      startAtRef.current = state.clock.elapsedTime;
    }
    const elapsed = state.clock.elapsedTime - startAtRef.current;
    const t = Math.min(1, elapsed / SHOWCASE_ENTRANCE_DURATION_S);
    const eased = easeOutQuint(t);
    const scale = THREE.MathUtils.lerp(0.86, 1, eased);
    const z = THREE.MathUtils.lerp(-1.25, 0, eased);
    const tiltX = THREE.MathUtils.lerp(0.05, 0, eased);
    const spinZ = THREE.MathUtils.lerp(-SHOWCASE_ENTRANCE_SPIN_RAD, 0, eased);
    const opacity = THREE.MathUtils.lerp(0, 1, eased);

    const originals = originalTransparentByUuidRef.current;
    const materials = collectOpacityMaterials(group);
    for (const mat of materials) {
      if (!originals.has(mat.uuid)) {
        originals.set(mat.uuid, mat.transparent);
      }
      mat.transparent = true;
      mat.opacity = opacity;
      mat.needsUpdate = true;
    }

    group.scale.setScalar(scale);
    group.position.z = z;
    group.rotation.x = tiltX;
    group.rotation.z = spinZ;
    invalidate();

    if (t >= 1) {
      completedRef.current = true;
      group.scale.setScalar(1);
      group.position.z = 0;
      group.rotation.x = 0;
      group.rotation.z = 0;
      restoreMaterials(collectOpacityMaterials(group), originals);
    }
  });

  return null;
}

/** Polar angle from +Y in degrees (Three.js spherical: 0 = above origin, 90 = horizon). */
export const BRACELET_VISUAL_DEFAULT_POLAR_DEG = 90;
export const BRACELET_VISUAL_DEFAULT_AZIMUTH_DEG = 12;
export const BRACELET_VISUAL_DEFAULT_DISTANCE = 12;
export const BRACELET_VISUAL_POLAR_MIN_DEG = 52;
export const BRACELET_VISUAL_POLAR_MAX_DEG = 125;
export const BRACELET_VISUAL_POLAR_STEP_DEG = 8;

/**
 * Eye position on a sphere around `target` (Three.js spherical: φ from +Y, θ around Y from +X).
 */
export function braceletShowcaseEyeFromSpherical({
  distance,
  polarDeg,
  azimuthDeg,
  target = [0, 0, 0] as const,
}: {
  distance: number;
  polarDeg: number;
  azimuthDeg: number;
  target?: readonly [number, number, number];
}): [number, number, number] {
  const phi = (polarDeg * Math.PI) / 180;
  const theta = (azimuthDeg * Math.PI) / 180;
  const sinPhi = Math.sin(phi);
  const x = target[0] + distance * sinPhi * Math.sin(theta);
  const y = target[1] + distance * Math.cos(phi);
  const z = target[2] + distance * sinPhi * Math.cos(theta);
  return [x, y, z];
}

function LookAtTarget({ target }: { target: readonly [number, number, number] }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.lookAt(target[0], target[1], target[2]);
  }, [camera, target]);
  return null;
}

function DemandInvalidate({
  cameraPosition,
  cameraTarget,
  braceletRotationRad,
  braceletWorldOffset,
}: {
  cameraPosition: readonly [number, number, number];
  cameraTarget: readonly [number, number, number];
  braceletRotationRad: number;
  braceletWorldOffset: readonly [number, number, number];
}) {
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    invalidate();
  }, [
    invalidate,
    cameraPosition[0],
    cameraPosition[1],
    cameraPosition[2],
    cameraTarget[0],
    cameraTarget[1],
    cameraTarget[2],
    braceletRotationRad,
    braceletWorldOffset[0],
    braceletWorldOffset[1],
    braceletWorldOffset[2],
  ]);
  return null;
}

const noopBeadClick = (_event: BeadClickEvent) => {};

export type KandiBraceletVisualCanvasProps = {
  beads: Bead[];
  /** World-space camera position; pair with `cameraTarget` for framing. */
  cameraPosition: readonly [number, number, number];
  cameraTarget?: readonly [number, number, number];
  fov?: number;
  /** Revolves the bracelet about world +Z (radians), same as the editor strand spin. */
  braceletRotationRad?: number;
  /** Translates strand + beads in world space before projection (e.g. negative Y to sit the top arc in view). */
  braceletWorldOffset?: readonly [number, number, number];
  /** Fade + slight Z spin / settle on mount (respects `prefers-reduced-motion`). */
  entranceMotionEnabled?: boolean;
  className?: string;
};

/**
 * Read-only bracelet WebGL view: same strand/bead meshes as the editor, no orbit controls and no bead hit targets.
 * Tune `cameraPosition` / `fov` / `braceletRotationRad` from the parent without touching `KandiCanvas`.
 */
export function KandiBraceletVisualCanvas({
  beads,
  cameraPosition,
  cameraTarget = [0, 0, 0] as const,
  fov = 50,
  braceletRotationRad = 0,
  braceletWorldOffset = [0, 0, 0] as const,
  entranceMotionEnabled = true,
  className,
}: KandiBraceletVisualCanvasProps) {
  const anchorContainerRef = useRef<HTMLElement | null>(null);
  const entranceGroupRef = useRef<THREE.Group>(null);
  const [hoveredBeadId, setHoveredBeadId] = useState<string | null>(null);

  const perforatedBeadGeometry = useMemo(() => createPerforatedBeadGeometry(), []);
  const perforatedLetterBeadGeometry = useMemo(() => createPerforatedLabelBeadGeometry(), []);

  useLayoutEffect(() => {
    return () => {
      perforatedBeadGeometry.dispose();
      perforatedLetterBeadGeometry.dispose();
    };
  }, [perforatedBeadGeometry, perforatedLetterBeadGeometry]);

  const isLowMemoryDevice = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return typeof deviceMemory === "number" && deviceMemory > 0 && deviceMemory <= 4;
  }, []);
  const isMemoryConstrained = isLowMemoryDevice || beads.length >= 160;
  const canvasDpr: [number, number] = isMemoryConstrained ? [0.75, 0.95] : [0.95, 1.1];
  const useCanvasShadows = !isMemoryConstrained;
  const directionalShadowMapSize = isMemoryConstrained ? 512 : 1024;
  const torusRadialSegments = isMemoryConstrained ? 8 : 10;
  const torusTubularSegments = isMemoryConstrained ? 96 : 160;

  const ringRadius = useMemo(() => braceletRingRadius(beads.length), [beads.length]);
  const strandTubeRadius = useMemo(() => braceletStrandTubeRadius(beads.length), [beads.length]);
  const points = useMemo(() => getRingPoints(beads.length, ringRadius), [beads.length, ringRadius]);

  return (
    <div className={className ?? "relative h-full min-h-0 w-full"}>
      <Canvas
        shadows={useCanvasShadows}
        dpr={canvasDpr}
        frameloop="demand"
        className="block h-full w-full touch-none"
        gl={{ alpha: true, antialias: !isMemoryConstrained, powerPreference: "low-power", stencil: false }}
        style={{ background: "transparent" }}
      >
        <DemandInvalidate
          cameraPosition={cameraPosition}
          cameraTarget={cameraTarget}
          braceletRotationRad={braceletRotationRad}
          braceletWorldOffset={braceletWorldOffset}
        />
        <ambientLight intensity={1.05} />
        <directionalLight
          position={[2, -3, 8]}
          intensity={1.45}
          color="#d6dded"
          castShadow={useCanvasShadows}
          shadow-mapSize-width={directionalShadowMapSize}
          shadow-mapSize-height={directionalShadowMapSize}
        />
        <directionalLight position={[-6, 4, 2]} intensity={0.62} color="#7a95ff" />

        <group position={[braceletWorldOffset[0], braceletWorldOffset[1], braceletWorldOffset[2]]}>
          <group ref={entranceGroupRef}>
            {entranceMotionEnabled ? <BraceletShowcaseEntranceMotion groupRef={entranceGroupRef} /> : null}
            <KandiBraceletStageMeshes
              beads={beads}
              selectedIds={[]}
              braceletSpinRad={braceletRotationRad}
              interactive={false}
              ringRadius={ringRadius}
              strandTubeRadius={strandTubeRadius}
              torusRadialSegments={torusRadialSegments}
              torusTubularSegments={torusTubularSegments}
              points={points}
              perforatedBeadGeometry={perforatedBeadGeometry}
              perforatedLetterBeadGeometry={perforatedLetterBeadGeometry}
              useShadows={useCanvasShadows}
              anchorContainerRef={anchorContainerRef}
              hoveredBeadId={hoveredBeadId}
              setHoveredBeadId={setHoveredBeadId}
              onBeadClick={noopBeadClick}
            />
          </group>
        </group>

        <PerspectiveCamera makeDefault fov={fov} position={cameraPosition} near={0.1} far={100} />
        <LookAtTarget target={cameraTarget} />
      </Canvas>
    </div>
  );
}
