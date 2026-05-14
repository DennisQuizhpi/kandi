"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Instance,
  Instances,
  OrbitControls,
  PerspectiveCamera,
  Text,
} from "@react-three/drei";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import * as THREE from "three";

import { braceletRingRadius, braceletStrandTubeRadius, MAX_BEAD_COUNT } from "@/lib/kandi/constants";
import { createPerforatedBeadGeometry } from "@/lib/kandi/perforatedBeadGeometry";
import { createPerforatedLabelBeadGeometry, LABEL_BEAD_SURFACE_OFFSET_XZ } from "@/lib/kandi/perforatedLabelBeadGeometry";
import { getRingPoints } from "@/lib/kandi/layout";
import type { RingPoint } from "@/lib/kandi/types";
import { Bead } from "@/lib/kandi/types";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const _upY = new THREE.Vector3(0, 1, 0);
const _tangent = new THREE.Vector3();
const _holeAlignQuat = new THREE.Quaternion();
const _alignEuler = new THREE.Euler();

function braceletHoleRotationTuple(angle: number): [number, number, number] {
  _tangent.set(-Math.sin(angle), Math.cos(angle), 0);
  _holeAlignQuat.setFromUnitVectors(_upY, _tangent);
  _alignEuler.setFromQuaternion(_holeAlignQuat, "XYZ");
  return [_alignEuler.x, _alignEuler.y, _alignEuler.z];
}

const _beadWorld = new THREE.Vector3();
const _beadProj = new THREE.Vector3();
const ignoreRaycast: THREE.Object3D["raycast"] = () => {};

function rotateBraceletPointToWorld(
  point: Pick<RingPoint, "x" | "y" | "z">,
  revolveRad: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const cos = Math.cos(revolveRad);
  const sin = Math.sin(revolveRad);
  return out.set(cos * point.x - sin * point.y, sin * point.x + cos * point.y, point.z);
}

function isBeadTooFarBack(
  point: Pick<RingPoint, "x" | "y" | "z">,
  revolveRad: number,
  camera: THREE.Camera,
  ringRadius: number,
): boolean {
  rotateBraceletPointToWorld(point, revolveRad, _beadWorld);
  const cam = camera.position;
  const camLen = cam.length();
  if (camLen < 1e-6) {
    return false;
  }
  const camY = cam.y / camLen;
  const lookingDown = Math.abs(camY) > 0.92;
  if (lookingDown) {
    return false;
  }
  const viewDirX = -cam.x / camLen;
  const viewDirY = -cam.y / camLen;
  const viewDirZ = -cam.z / camLen;
  const depth = _beadWorld.x * viewDirX + _beadWorld.y * viewDirY + _beadWorld.z * viewDirZ;
  return depth > ringRadius * 0.2;
}

function overlayAnchorFromRingPoint(
  point: RingPoint,
  revolveRad: number,
  camera: THREE.Camera,
  size: { width: number; height: number },
  gl: THREE.WebGLRenderer,
  anchorContainer: HTMLElement | null,
): { x: number; y: number } {
  rotateBraceletPointToWorld(point, revolveRad, _beadProj);
  _beadProj.project(camera);
  const canvasEl = gl.domElement as HTMLCanvasElement;
  const rect = canvasEl.getBoundingClientRect();
  const sx = rect.width / size.width;
  const sy = rect.height / size.height;
  const px = (_beadProj.x * 0.5 + 0.5) * size.width;
  const py = (-_beadProj.y * 0.5 + 0.5) * size.height;
  const screenX = rect.left + px * sx;
  const screenY = rect.top + py * sy;
  if (!anchorContainer) {
    return { x: screenX, y: screenY };
  }
  const pr = anchorContainer.getBoundingClientRect();
  return { x: screenX - pr.left, y: screenY - pr.top };
}

const FOCUS_TO_FRONT_SMOOTH_K = 12;
const FOCUS_TO_FRONT_EPS_RAD = 1e-3;

/**
 * Default eye position for the bracelet preset (OrbitControls distance matches vector length).
 * Pulled back for full-viewport layouts so the ring isn’t framed too tight.
 */
const BRACELET_CAMERA_POSITION: [number, number, number] = [0, -12.85, 6.85];

/** Nearly straight-down view (OrbitControls polar angle φ from +Y). */
const BIRDS_EYE_POLAR = 0.11;

/** Bottom-bar tilt range (degrees). Default sits one step from each end. */
export const GUIDED_ELEVATION_MIN_DEG = -30;
export const GUIDED_ELEVATION_MAX_DEG = 0;
export const GUIDED_ELEVATION_DEFAULT_DEG = -15;

/** One tap moves one step toward min or max (`GUIDED_ELEVATION_DEFAULT_DEG` ± one interval). */
export const GUIDED_ELEVATION_STEP_DEG = 15;

/** Exponential smoothing rate for guided camera φ / θ (higher = snappier). */
const GUIDED_CAMERA_SMOOTH_K = 14;
const GUIDED_ROTATE_STEP_SMOOTH_K = 18;
const GUIDED_ROTATE_STEP_EPS_RAD = 2e-4;
const BRACELET_ENTRANCE_DURATION_S = 0.72;
const BRACELET_ENTRANCE_SPIN_RAD = 0.34;

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

function braceletViewPolarAngle(): number {
  const [x, y, z] = BRACELET_CAMERA_POSITION;
  const len = Math.hypot(x, y, z);
  return Math.acos(THREE.MathUtils.clamp(y / len, -1, 1));
}

function clampGuidedElevationDeg(deg: number): number {
  return THREE.MathUtils.clamp(deg, GUIDED_ELEVATION_MIN_DEG, GUIDED_ELEVATION_MAX_DEG);
}

/**
 * Locked polar for guided mode. More-negative `elevationDeg` lowers the view (φ increases); `0` matches preset base φ.
 * Degrees are clamped to `[GUIDED_ELEVATION_MIN_DEG, GUIDED_ELEVATION_MAX_DEG]`.
 */
function guidedLockedPolarRadians(preset: GuidedCameraPreset, elevationDeg: number): number {
  const clampedDeg = clampGuidedElevationDeg(elevationDeg);
  const elevRad = (clampedDeg * Math.PI) / 180;
  const base = preset === "top" ? BIRDS_EYE_POLAR : braceletViewPolarAngle();
  const polar = base - elevRad;
  const polarAtMaxElev = base;
  const polarAtMinElev = base - (GUIDED_ELEVATION_MIN_DEG * Math.PI) / 180;
  const polarMin = Math.min(polarAtMaxElev, polarAtMinElev);
  const polarMax = Math.max(polarAtMaxElev, polarAtMinElev);
  return THREE.MathUtils.clamp(polar, Math.max(0.04, polarMin), Math.min(Math.PI - 0.04, polarMax));
}

const LETTER_FACE_LAYERS: Array<{
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
}> = [
  { position: [LABEL_BEAD_SURFACE_OFFSET_XZ, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { position: [-LABEL_BEAD_SURFACE_OFFSET_XZ, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  { position: [0, 0, LABEL_BEAD_SURFACE_OFFSET_XZ], rotation: [0, 0, 0] },
  { position: [0, 0, -LABEL_BEAD_SURFACE_OFFSET_XZ], rotation: [0, Math.PI, 0] },
];

const LETTER_FONT_SIZE = 0.24 * 1.25 * 1.25;
const LETTER_TEXT_PLANE_FLIP_RAD = Math.PI;

const TEXT_BEAD_SIDE_COLOR = "#101318";

/** Letter bead mesh body (product rule: visually white / off-white). */
const LETTER_BEAD_BODY_COLOR = "#fdfdfd";

/** Brightness multiplier while hovering a bead that is not the current selection. */
const NON_SELECTION_HOVER_BRIGHTNESS = 0.75;
const MULTI_SELECTED_BRIGHTNESS = 0.75;
const MULTI_UNSELECTED_BRIGHTNESS = 0.42;
const MULTI_UNSELECTED_HOVER_BRIGHTNESS = 1.08;

function brightnessScaledHex(hex: string, factor: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return `#${c.getHexString()}`;
}

/** Scale pulse when a bead is selected (round + letter meshes). */
const SELECTED_BEAD_SCALE = 1.18;
const BEAD_SELECTION_SCALE_DURATION = 0.1;

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Smoothly lerps `object.scale` toward selected / idle size. Priority **-1** runs before drei's
 * `Instances` useFrame (priority 0) so matrices are current. Must stay ≤0 so we don't flip R3F into
 * manual-only rendering once per bead (each positive useFrame priority increments `internal.priority` and disables
 * the default `gl.render`).
 */
function useAnimatedSelectionScale(ref: RefObject<THREE.Object3D | null>, selected: boolean) {
  const clock = useThree((s) => s.clock);
  const animRef = useRef<{ from: number; to: number; startAt: number | null }>({
    from: 1,
    to: 1,
    startAt: null,
  });

  useEffect(() => {
    const target = selected ? SELECTED_BEAD_SCALE : 1;
    const obj = ref.current;
    const current = obj?.scale.x ?? 1;
    if (Math.abs(current - target) < 1e-5) {
      animRef.current = { from: target, to: target, startAt: null };
      if (obj) {
        obj.scale.setScalar(target);
      }
      return;
    }
    animRef.current = { from: current, to: target, startAt: clock.elapsedTime };
  }, [selected, clock, ref]);

  useFrame(() => {
    const obj = ref.current;
    if (!obj) {
      return;
    }
    const state = animRef.current;
    if (state.startAt === null) {
      obj.scale.setScalar(state.to);
      return;
    }
    const t = Math.min(1, (clock.elapsedTime - state.startAt) / BEAD_SELECTION_SCALE_DURATION);
    const eased = easeOutQuad(t);
    const s = state.from + (state.to - state.from) * eased;
    obj.scale.setScalar(s);
    if (t >= 1) {
      animRef.current = { from: state.to, to: state.to, startAt: null };
    }
  }, -1);
}

/**
 * Strand-aligned layout on the lateral faces. Use `-y` for horizontal (not `+y`) so glyphs are not
 * mirrored after the face `rotation` transforms — Troika’s `+y+x` showed backward D/Z from the camera.
 */
const LETTER_TEXT_ORIENTATION = "-y+x" as const;

function LetterBeadGroup({
  bead,
  selected,
  multiSelectActive,
  point,
  geometry,
  braceletRevolveRad,
  ringRadius,
  anchorContainerRef,
  hoveredBeadId,
  setHoveredBeadId,
  onHoveredBeadMeta,
  onBeadClick,
  useShadows,
  interactive,
}: {
  bead: Bead;
  selected: boolean;
  multiSelectActive: boolean;
  point: ReturnType<typeof getRingPoints>[number];
  geometry: THREE.BufferGeometry;
  braceletRevolveRad: number;
  ringRadius: number;
  anchorContainerRef: RefObject<HTMLElement | null>;
  hoveredBeadId: string | null;
  setHoveredBeadId: Dispatch<SetStateAction<string | null>>;
  onHoveredBeadMeta?: (meta: HoveredBeadMeta | null) => void;
  onBeadClick: (event: BeadClickEvent) => void;
  useShadows: boolean;
  interactive: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  useAnimatedSelectionScale(groupRef, selected);
  const rotation = useMemo(() => braceletHoleRotationTuple(point.angle), [point.angle]);
  const dimNonSelectionHover = hoveredBeadId === bead.id && !selected;
  const dimMultiSelected = selected && multiSelectActive;
  const dimMultiUnselected = multiSelectActive && !selected;
  const lightUpMultiUnselectedHover = dimNonSelectionHover && dimMultiUnselected;
  const bodyColor = useMemo(
    () =>
      dimNonSelectionHover || dimMultiSelected || dimMultiUnselected
        ? brightnessScaledHex(
            LETTER_BEAD_BODY_COLOR,
            lightUpMultiUnselectedHover
              ? MULTI_UNSELECTED_HOVER_BRIGHTNESS
              : dimMultiUnselected
              ? MULTI_UNSELECTED_BRIGHTNESS
              : NON_SELECTION_HOVER_BRIGHTNESS,
          )
        : LETTER_BEAD_BODY_COLOR,
    [dimMultiSelected, dimMultiUnselected, dimNonSelectionHover, lightUpMultiUnselectedHover],
  );

  return (
    <group ref={groupRef} position={[point.x, point.y, point.z]} rotation={rotation}>
      <mesh
        castShadow={useShadows}
        receiveShadow={useShadows}
        geometry={geometry}
        raycast={interactive ? undefined : ignoreRaycast}
        {...(interactive
          ? {
              onPointerOver: (event) => {
                event.stopPropagation();
                const isBack = isBeadTooFarBack(point, braceletRevolveRad, camera, ringRadius);
                const anchor = overlayAnchorFromRingPoint(
                  point,
                  braceletRevolveRad,
                  camera,
                  size,
                  gl,
                  anchorContainerRef.current,
                );
                onHoveredBeadMeta?.({ beadId: bead.id, anchor, isFront: !isBack });
                setHoveredBeadId(bead.id);
                invalidate();
              },
              onPointerOut: (event) => {
                event.stopPropagation();
                onHoveredBeadMeta?.(null);
                setHoveredBeadId((current) => (current === bead.id ? null : current));
                invalidate();
              },
              onPointerDown: (event) => {
                event.stopPropagation();
                if (event.button !== 0) {
                  return;
                }
                const native = event.nativeEvent as MouseEvent;
                const isBack = isBeadTooFarBack(point, braceletRevolveRad, camera, ringRadius);
                const beadAnchor = overlayAnchorFromRingPoint(
                  point,
                  braceletRevolveRad,
                  camera,
                  size,
                  gl,
                  anchorContainerRef.current,
                );
                onBeadClick({
                  beadId: bead.id,
                  rangeSelect: native.shiftKey,
                  toggleSelect: native.metaKey || native.ctrlKey,
                  isBack,
                  beadAnchor,
                });
              },
            }
          : {})}
      >
        <meshStandardMaterial color={bodyColor} roughness={0.38} metalness={0.04} flatShading={false} />
      </mesh>
      {LETTER_FACE_LAYERS.map((layer, idx) => (
        <Text
          key={`${bead.id}-face-${idx}`}
          position={[...layer.position]}
          rotation={[layer.rotation[0], layer.rotation[1], layer.rotation[2] + LETTER_TEXT_PLANE_FLIP_RAD]}
          fontSize={LETTER_FONT_SIZE}
          color={TEXT_BEAD_SIDE_COLOR}
          fontWeight={700}
          anchorX="center"
          anchorY="middle"
          depthOffset={-0.005}
          onSync={(troikaMesh) => {
            troikaMesh.orientation = LETTER_TEXT_ORIENTATION;
            troikaMesh.raycast = () => {};
          }}
        >
          {bead.label}
        </Text>
      ))}
    </group>
  );
}

function LetterBeadGroups({
  beads,
  selectedIdSet,
  multiSelectActive,
  points,
  geometry,
  braceletRevolveRad,
  ringRadius,
  anchorContainerRef,
  hoveredBeadId,
  setHoveredBeadId,
  onHoveredBeadMeta,
  onBeadClick,
  useShadows,
  interactive,
}: {
  beads: Bead[];
  selectedIdSet: ReadonlySet<string>;
  multiSelectActive: boolean;
  points: ReturnType<typeof getRingPoints>;
  geometry: THREE.BufferGeometry;
  braceletRevolveRad: number;
  ringRadius: number;
  anchorContainerRef: RefObject<HTMLElement | null>;
  hoveredBeadId: string | null;
  setHoveredBeadId: Dispatch<SetStateAction<string | null>>;
  onHoveredBeadMeta?: (meta: HoveredBeadMeta | null) => void;
  onBeadClick: (event: BeadClickEvent) => void;
  useShadows: boolean;
  interactive: boolean;
}) {
  const labeledBeads = useMemo(() => beads.filter((bead) => bead.label && bead.label.length > 0), [beads]);

  return (
    <>
      {labeledBeads.map((bead) => {
        const point = points[bead.index];
        return (
          <LetterBeadGroup
            key={bead.id}
            bead={bead}
            selected={selectedIdSet.has(bead.id)}
            multiSelectActive={multiSelectActive}
            point={point}
            geometry={geometry}
            braceletRevolveRad={braceletRevolveRad}
            ringRadius={ringRadius}
            anchorContainerRef={anchorContainerRef}
            hoveredBeadId={hoveredBeadId}
            setHoveredBeadId={setHoveredBeadId}
            onHoveredBeadMeta={onHoveredBeadMeta}
            onBeadClick={onBeadClick}
            useShadows={useShadows}
            interactive={interactive}
          />
        );
      })}
    </>
  );
}

export type BeadClickEvent = {
  beadId: string;
  rangeSelect: boolean;
  toggleSelect: boolean;
  isBack: boolean;
  beadAnchor: { x: number; y: number };
};

export type HoveredBeadMeta = {
  beadId: string;
  anchor: { x: number; y: number };
  isFront: boolean;
};

export type GuidedCameraPreset = "bracelet" | "top";

interface KandiCanvasProps {
  beads: Bead[];
  selectedIds: string[];
  editingEnabled?: boolean;
  activeBeadId?: string | null;
  /** Increment from the shell to snap orbit + bracelet revolution to defaults. */
  orbitResetToken: number;
  guidedPreset?: GuidedCameraPreset;
  /** Tilt offset in degrees; clamped [`GUIDED_ELEVATION_MIN_DEG`, `GUIDED_ELEVATION_MAX_DEG`]. */
  guidedElevationDeg?: number;
  /** Bump `guidedRotateTick` with `guidedRotateDeltaDeg` for bracelet steps from the shell. */
  guidedRotateTick?: number;
  guidedRotateDeltaDeg?: number;
  /** Element that spans the canvas stage; anchors are expressed in this box’s coordinates. */
  anchorContainerRef?: RefObject<HTMLElement | null>;
  /** Bead id to bring to the front via bracelet revolution before selection. */
  pendingFocusBeadId?: string | null;
  /** Fired once revolution has settled on the pending focus bead. */
  onFocusComplete?: (beadId: string) => void;
  onHoveredBeadMeta?: (meta: HoveredBeadMeta | null) => void;
  onActiveBeadMeta?: (meta: HoveredBeadMeta | null) => void;
  onBeadClick: (event: BeadClickEvent) => void;
  onClearSelection: () => void;
}

function ActiveBeadMetaDrive({
  activeBeadId,
  beads,
  points,
  braceletRevolveRad,
  ringRadius,
  anchorContainerRef,
  onActiveBeadMeta,
}: {
  activeBeadId: string | null;
  beads: Bead[];
  points: ReturnType<typeof getRingPoints>;
  braceletRevolveRad: number;
  ringRadius: number;
  anchorContainerRef: RefObject<HTMLElement | null>;
  onActiveBeadMeta?: (meta: HoveredBeadMeta | null) => void;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const lastKeyRef = useRef<string | null>(null);

  useFrame(() => {
    if (!onActiveBeadMeta) {
      return;
    }
    if (!activeBeadId) {
      if (lastKeyRef.current !== null) {
        lastKeyRef.current = null;
        onActiveBeadMeta(null);
      }
      return;
    }
    const bead = beads.find((b) => b.id === activeBeadId);
    if (!bead) {
      if (lastKeyRef.current !== null) {
        lastKeyRef.current = null;
        onActiveBeadMeta(null);
      }
      return;
    }
    const point = points[bead.index];
    const isBack = isBeadTooFarBack(point, braceletRevolveRad, camera, ringRadius);
    const anchor = overlayAnchorFromRingPoint(
      point,
      braceletRevolveRad,
      camera,
      size,
      gl,
      anchorContainerRef.current,
    );
    const key = `${bead.id}:${isBack ? 0 : 1}:${anchor.x.toFixed(1)}:${anchor.y.toFixed(1)}`;
    if (key === lastKeyRef.current) {
      return;
    }
    lastKeyRef.current = key;
    onActiveBeadMeta({ beadId: bead.id, anchor, isFront: !isBack });
  });

  return null;
}

function AnimatedRoundBeadInstance({
  bead,
  selected,
  multiSelectActive,
  point,
  braceletRevolveRad,
  ringRadius,
  anchorContainerRef,
  hoveredBeadId,
  setHoveredBeadId,
  onHoveredBeadMeta,
  onBeadClick,
  interactive,
}: {
  bead: Bead;
  selected: boolean;
  multiSelectActive: boolean;
  point: ReturnType<typeof getRingPoints>[number];
  braceletRevolveRad: number;
  ringRadius: number;
  anchorContainerRef: RefObject<HTMLElement | null>;
  hoveredBeadId: string | null;
  setHoveredBeadId: Dispatch<SetStateAction<string | null>>;
  onHoveredBeadMeta?: (meta: HoveredBeadMeta | null) => void;
  onBeadClick: (event: BeadClickEvent) => void;
  interactive: boolean;
}) {
  const instanceRef = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  useAnimatedSelectionScale(instanceRef, selected);
  const rotation = useMemo(() => braceletHoleRotationTuple(point.angle), [point.angle]);
  const dimNonSelectionHover = hoveredBeadId === bead.id && !selected;
  const dimMultiSelected = selected && multiSelectActive;
  const dimMultiUnselected = multiSelectActive && !selected;
  const lightUpMultiUnselectedHover = dimNonSelectionHover && dimMultiUnselected;
  const displayColor = useMemo(
    () =>
      dimNonSelectionHover || dimMultiSelected || dimMultiUnselected
        ? brightnessScaledHex(
            bead.color,
            lightUpMultiUnselectedHover
              ? MULTI_UNSELECTED_HOVER_BRIGHTNESS
              : dimMultiUnselected
              ? MULTI_UNSELECTED_BRIGHTNESS
              : dimMultiSelected
                ? MULTI_SELECTED_BRIGHTNESS
                : NON_SELECTION_HOVER_BRIGHTNESS,
          )
        : bead.color,
    [bead.color, dimMultiSelected, dimMultiUnselected, dimNonSelectionHover, lightUpMultiUnselectedHover],
  );

  return (
    <Instance
      ref={instanceRef}
      position={[point.x, point.y, point.z]}
      color={displayColor}
      rotation={rotation}
      scale={1}
      raycast={interactive ? undefined : ignoreRaycast}
      {...(interactive
        ? {
            onPointerOver: (event) => {
              event.stopPropagation();
              const isBack = isBeadTooFarBack(point, braceletRevolveRad, camera, ringRadius);
              const anchor = overlayAnchorFromRingPoint(
                point,
                braceletRevolveRad,
                camera,
                size,
                gl,
                anchorContainerRef.current,
              );
              onHoveredBeadMeta?.({ beadId: bead.id, anchor, isFront: !isBack });
              setHoveredBeadId(bead.id);
              invalidate();
            },
            onPointerOut: (event) => {
              event.stopPropagation();
              onHoveredBeadMeta?.(null);
              setHoveredBeadId((current) => (current === bead.id ? null : current));
              invalidate();
            },
            onPointerDown: (event) => {
              event.stopPropagation();
              if (event.button !== 0) {
                return;
              }
              const native = event.nativeEvent as MouseEvent;
              const isBack = isBeadTooFarBack(point, braceletRevolveRad, camera, ringRadius);
              const beadAnchor = overlayAnchorFromRingPoint(
                point,
                braceletRevolveRad,
                camera,
                size,
                gl,
                anchorContainerRef.current,
              );
              onBeadClick({
                beadId: bead.id,
                rangeSelect: native.shiftKey,
                toggleSelect: native.metaKey || native.ctrlKey,
                isBack,
                beadAnchor,
              });
            },
          }
        : {})}
    />
  );
}

function PerforatedBeadInstances({
  beads,
  selectedIdSet,
  multiSelectActive,
  points,
  geometry,
  braceletRevolveRad,
  ringRadius,
  anchorContainerRef,
  hoveredBeadId,
  setHoveredBeadId,
  onHoveredBeadMeta,
  onBeadClick,
  useShadows,
  interactive,
}: {
  beads: Bead[];
  selectedIdSet: ReadonlySet<string>;
  multiSelectActive: boolean;
  points: ReturnType<typeof getRingPoints>;
  geometry: THREE.BufferGeometry;
  braceletRevolveRad: number;
  ringRadius: number;
  anchorContainerRef: RefObject<HTMLElement | null>;
  hoveredBeadId: string | null;
  setHoveredBeadId: Dispatch<SetStateAction<string | null>>;
  onHoveredBeadMeta?: (meta: HoveredBeadMeta | null) => void;
  onBeadClick: (event: BeadClickEvent) => void;
  useShadows: boolean;
  interactive: boolean;
}) {
  return (
    <Instances
      // Matrix/color buffers are sized once from `limit` on mount; never under-size.
      limit={MAX_BEAD_COUNT}
      geometry={geometry}
      range={beads.length}
      castShadow={useShadows}
      receiveShadow={useShadows}
    >
      <meshStandardMaterial roughness={0.24} metalness={0} toneMapped={false} />

      {beads.map((bead) => {
        const point = points[bead.index];

        return (
          <AnimatedRoundBeadInstance
            key={bead.id}
            bead={bead}
            selected={selectedIdSet.has(bead.id)}
            multiSelectActive={multiSelectActive}
            point={point}
            braceletRevolveRad={braceletRevolveRad}
            ringRadius={ringRadius}
            anchorContainerRef={anchorContainerRef}
            hoveredBeadId={hoveredBeadId}
            setHoveredBeadId={setHoveredBeadId}
            onHoveredBeadMeta={onHoveredBeadMeta}
            onBeadClick={onBeadClick}
            interactive={interactive}
          />
        );
      })}
    </Instances>
  );
}

export type KandiBraceletStageMeshesProps = {
  beads: Bead[];
  selectedIds: string[];
  braceletSpinRad: number;
  interactive: boolean;
  ringRadius: number;
  strandTubeRadius: number;
  torusRadialSegments: number;
  torusTubularSegments: number;
  points: ReturnType<typeof getRingPoints>;
  perforatedBeadGeometry: THREE.BufferGeometry;
  perforatedLetterBeadGeometry: THREE.BufferGeometry;
  useShadows: boolean;
  anchorContainerRef: RefObject<HTMLElement | null>;
  hoveredBeadId: string | null;
  setHoveredBeadId: Dispatch<SetStateAction<string | null>>;
  onHoveredBeadMeta?: (meta: HoveredBeadMeta | null) => void;
  onBeadClick: (event: BeadClickEvent) => void;
};

/** Strand + instanced beads + letter beads; shared by `KandiCanvas` and read-only showcase canvases. */
export function KandiBraceletStageMeshes({
  beads,
  selectedIds,
  braceletSpinRad,
  interactive,
  ringRadius,
  strandTubeRadius,
  torusRadialSegments,
  torusTubularSegments,
  points,
  perforatedBeadGeometry,
  perforatedLetterBeadGeometry,
  useShadows,
  anchorContainerRef,
  hoveredBeadId,
  setHoveredBeadId,
  onHoveredBeadMeta,
  onBeadClick,
}: KandiBraceletStageMeshesProps) {
  const plainBeads = useMemo(() => beads.filter((bead) => !bead.label?.length), [beads]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const multiSelectActive = selectedIds.length > 1;

  return (
    <group rotation={[0, 0, braceletSpinRad]}>
      <mesh receiveShadow={useShadows} raycast={ignoreRaycast}>
        <torusGeometry args={[ringRadius, strandTubeRadius, torusRadialSegments, torusTubularSegments]} />
        <meshStandardMaterial
          color="#1b1e24"
          roughness={0.88}
          metalness={0.04}
          emissive="#0a0c10"
          emissiveIntensity={0.15}
        />
      </mesh>

      <PerforatedBeadInstances
        beads={plainBeads}
        selectedIdSet={selectedIdSet}
        multiSelectActive={multiSelectActive}
        geometry={perforatedBeadGeometry}
        points={points}
        braceletRevolveRad={braceletSpinRad}
        ringRadius={ringRadius}
        anchorContainerRef={anchorContainerRef}
        hoveredBeadId={hoveredBeadId}
        setHoveredBeadId={setHoveredBeadId}
        onHoveredBeadMeta={onHoveredBeadMeta}
        onBeadClick={onBeadClick}
        useShadows={useShadows}
        interactive={interactive}
      />

      <LetterBeadGroups
        beads={beads}
        selectedIdSet={selectedIdSet}
        multiSelectActive={multiSelectActive}
        points={points}
        geometry={perforatedLetterBeadGeometry}
        braceletRevolveRad={braceletSpinRad}
        ringRadius={ringRadius}
        anchorContainerRef={anchorContainerRef}
        hoveredBeadId={hoveredBeadId}
        setHoveredBeadId={setHoveredBeadId}
        onHoveredBeadMeta={onHoveredBeadMeta}
        onBeadClick={onBeadClick}
        useShadows={useShadows}
        interactive={interactive}
      />
    </group>
  );
}

function ResetOrbitEffect({ orbitResetToken }: { orbitResetToken: number }) {
  const controls = useThree((state) => state.controls);
  const invalidate = useThree((state) => state.invalidate);
  const lastAppliedTokenRef = useRef(0);

  useEffect(() => {
    if (orbitResetToken === 0 || orbitResetToken === lastAppliedTokenRef.current) {
      return;
    }
    lastAppliedTokenRef.current = orbitResetToken;

    const orbit = controls as OrbitControlsImpl | null;
    if (orbit?.reset !== undefined) {
      orbit.reset();
      invalidate();
    }
  }, [orbitResetToken, controls, invalidate]);

  return null;
}

/**
 * Lerps OrbitControls φ toward the guided preset + elevation target each frame. Bird’s-eye also lerps
 * azimuth toward 0. Bracelet preset leaves θ unchanged. Guided polar min/max are widened in `CameraRig`
 * so intermediate angles aren’t clamped during transitions.
 */
function GuidedCameraSmoothDrive({
  guidedPreset,
  guidedElevationDeg,
  orbitResetToken,
}: {
  guidedPreset: GuidedCameraPreset;
  guidedElevationDeg: number;
  orbitResetToken: number;
}) {
  const controls = useThree((state) => state.controls);
  const invalidate = useThree((state) => state.invalidate);

  const targetPhiRef = useRef(guidedLockedPolarRadians(guidedPreset, guidedElevationDeg));
  const syncAzimuthRef = useRef(guidedPreset === "top");
  const targetThetaRef = useRef(0);

  useEffect(() => {
    targetPhiRef.current = guidedLockedPolarRadians(guidedPreset, guidedElevationDeg);
    syncAzimuthRef.current = guidedPreset === "top";
    if (guidedPreset === "top") {
      targetThetaRef.current = 0;
    }
  }, [guidedElevationDeg, guidedPreset, orbitResetToken]);

  useFrame((_, delta) => {
    const orbit = controls as OrbitControlsImpl | null;
    if (!orbit?.getPolarAngle || !orbit.setPolarAngle) {
      return;
    }

    const tgtPhi = targetPhiRef.current;
    const phi = orbit.getPolarAngle();
    const alpha = 1 - Math.exp(-GUIDED_CAMERA_SMOOTH_K * Math.min(delta, 0.064));
    const nextPhi = phi + (tgtPhi - phi) * alpha;
    orbit.setPolarAngle(nextPhi);

    let moved = Math.abs(nextPhi - phi) > 1e-6;

    if (syncAzimuthRef.current && orbit.getAzimuthalAngle && orbit.setAzimuthalAngle) {
      const theta = orbit.getAzimuthalAngle();
      const tgtTheta = targetThetaRef.current;
      const dTheta = shortestAngleDelta(theta, tgtTheta);
      const nextTheta = theta + dTheta * alpha;
      orbit.setAzimuthalAngle(nextTheta);
      moved ||= Math.abs(dTheta) > 1e-6;
    }

    if (moved) {
      invalidate();
    }
  });

  return null;
}

function GuidedBraceletStepEffect({
  guidedRotateTick,
  guidedRotateDeltaDeg,
  onRevolveDeltaRad,
}: {
  guidedRotateTick: number;
  guidedRotateDeltaDeg: number;
  onRevolveDeltaRad: (deltaRad: number) => void;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const remainingDeltaRef = useRef(0);

  useEffect(() => {
    if (guidedRotateTick === 0) {
      return;
    }
    remainingDeltaRef.current += (guidedRotateDeltaDeg * Math.PI) / 180;
    invalidate();
  }, [guidedRotateDeltaDeg, guidedRotateTick, invalidate, onRevolveDeltaRad]);

  useFrame((_, delta) => {
    const remaining = remainingDeltaRef.current;
    if (Math.abs(remaining) < GUIDED_ROTATE_STEP_EPS_RAD) {
      if (remaining !== 0) {
        onRevolveDeltaRad(remaining);
        remainingDeltaRef.current = 0;
      }
      return;
    }
    const alpha = 1 - Math.exp(-GUIDED_ROTATE_STEP_SMOOTH_K * Math.min(delta, 0.064));
    const step = remaining * alpha;
    onRevolveDeltaRad(step);
    remainingDeltaRef.current = remaining - step;
    invalidate();
  });

  return null;
}

/**
 * Rigid revolution of the strand + beads about **world Z** (`getRingPoints` lies in XY). Horizontal
 * pointer Δ only; matches OrbitControls rotate sensitivity (`2π·Δx / height`).
 */
function GuidedBraceletDragRevolve({ onRevolveDeltaRad }: { onRevolveDeltaRad: (deltaRad: number) => void }) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const element = gl.domElement;
    let dragging = false;
    let lastClientX = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.shiftKey === true) {
        return;
      }
      dragging = true;
      lastClientX = event.clientX;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      const dx = event.clientX - lastClientX;
      lastClientX = event.clientX;
      const height = element.clientHeight || 1;
      const deltaRad = (2 * Math.PI * dx) / height;
      onRevolveDeltaRad(deltaRad);
      invalidate();
    };

    const endDrag = () => {
      dragging = false;
    };

    element.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);

    return () => {
      dragging = false;
      element.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", endDrag);
      document.removeEventListener("pointercancel", endDrag);
    };
  }, [gl.domElement, invalidate, onRevolveDeltaRad]);

  return null;
}

function BraceletEntranceMotion({ groupRef }: { groupRef: RefObject<THREE.Group | null> }) {
  const invalidate = useThree((s) => s.invalidate);
  const [reducedMotion, setReducedMotion] = useState(false);
  const startAtRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const materialsRef = useRef<Array<{ material: THREE.Material; transparent: boolean }>>([]);

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
    const found: Array<{ material: THREE.Material; transparent: boolean }> = [];
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) {
        return;
      }
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (!mat) {
          return;
        }
        if (!found.some((entry) => entry.material === mat)) {
          found.push({ material: mat, transparent: mat.transparent });
        }
      });
    });
    materialsRef.current = found;

    if (reducedMotion) {
      group.scale.setScalar(1);
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      materialsRef.current.forEach(({ material, transparent }) => {
        material.transparent = transparent;
        material.opacity = 1;
        material.needsUpdate = true;
      });
      completedRef.current = true;
      return;
    }
    group.scale.setScalar(0.84);
    group.position.set(0, 0, -1.4);
    group.rotation.set(0.06, 0, -BRACELET_ENTRANCE_SPIN_RAD);
    materialsRef.current.forEach(({ material }) => {
      material.transparent = true;
      material.opacity = 0;
      material.needsUpdate = true;
    });
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
    const t = Math.min(1, elapsed / BRACELET_ENTRANCE_DURATION_S);
    const eased = easeOutQuint(t);
    const scale = THREE.MathUtils.lerp(0.84, 1, eased);
    const z = THREE.MathUtils.lerp(-1.4, 0, eased);
    const tiltX = THREE.MathUtils.lerp(0.06, 0, eased);
    const spinZ = THREE.MathUtils.lerp(-BRACELET_ENTRANCE_SPIN_RAD, 0, eased);
    const opacity = THREE.MathUtils.lerp(0, 1, eased);

    group.scale.setScalar(scale);
    group.position.z = z;
    group.rotation.x = tiltX;
    group.rotation.z = spinZ;
    materialsRef.current.forEach(({ material }) => {
      material.opacity = opacity;
    });
    invalidate();

    if (t >= 1) {
      completedRef.current = true;
      group.scale.setScalar(1);
      group.position.z = 0;
      group.rotation.x = 0;
      group.rotation.z = 0;
      materialsRef.current.forEach(({ material, transparent }) => {
        material.opacity = 1;
        material.transparent = transparent;
        material.needsUpdate = true;
      });
    }
  });

  return null;
}

function BraceletFocusToFrontDrive({
  pendingFocusBeadId,
  beads,
  points,
  braceletRevolveRad,
  onRevolveDeltaRad,
  onFocusComplete,
}: {
  pendingFocusBeadId: string | null;
  beads: Bead[];
  points: ReturnType<typeof getRingPoints>;
  braceletRevolveRad: number;
  onRevolveDeltaRad: (deltaRad: number) => void;
  onFocusComplete: (beadId: string) => void;
}) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const goalAngleRef = useRef<number | null>(null);
  const activeBeadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingFocusBeadId) {
      goalAngleRef.current = null;
      activeBeadIdRef.current = null;
      return;
    }
    const cam = camera.position;
    const len = cam.length();
    goalAngleRef.current = len > 1e-6 ? Math.atan2(cam.y / len, cam.x / len) : -Math.PI / 2;
    activeBeadIdRef.current = pendingFocusBeadId;
  }, [pendingFocusBeadId, camera]);

  useFrame((_, delta) => {
    const beadId = activeBeadIdRef.current;
    const goal = goalAngleRef.current;
    if (!beadId || goal === null) {
      return;
    }
    const bead = beads.find((b) => b.id === beadId);
    if (!bead) {
      activeBeadIdRef.current = null;
      goalAngleRef.current = null;
      return;
    }
    const ringAngle = points[bead.index].angle;
    const currentAngle = ringAngle + braceletRevolveRad;
    const err = shortestAngleDelta(currentAngle, goal);
    if (Math.abs(err) < FOCUS_TO_FRONT_EPS_RAD) {
      const doneId = beadId;
      activeBeadIdRef.current = null;
      goalAngleRef.current = null;
      onFocusComplete(doneId);
      return;
    }
    const alpha = 1 - Math.exp(-FOCUS_TO_FRONT_SMOOTH_K * Math.min(delta, 0.064));
    const step = err * alpha;
    onRevolveDeltaRad(step);
    invalidate();
  });

  return null;
}

function CameraRig() {
  return (
    <>
      <PerspectiveCamera makeDefault fov={50} position={BRACELET_CAMERA_POSITION} near={0.1} far={100} />
      <OrbitControls
        enablePan={false}
        enableRotate={false}
        minDistance={4}
        maxDistance={24}
        minPolarAngle={0.04}
        maxPolarAngle={Math.PI - 0.04}
        enableDamping={false}
        makeDefault
      />
    </>
  );
}

export function KandiCanvas({
  beads,
  selectedIds,
  editingEnabled = true,
  activeBeadId = null,
  orbitResetToken,
  guidedPreset = "bracelet",
  guidedElevationDeg = GUIDED_ELEVATION_DEFAULT_DEG,
  guidedRotateTick = 0,
  guidedRotateDeltaDeg = 0,
  anchorContainerRef,
  pendingFocusBeadId = null,
  onFocusComplete,
  onHoveredBeadMeta,
  onActiveBeadMeta,
  onBeadClick,
  onClearSelection,
}: KandiCanvasProps) {
  const nullAnchorContainerRef = useRef<HTMLElement | null>(null);
  const [braceletRevolveRad, setBraceletRevolveRad] = useState(0);
  const applyBraceletRevolveDelta = useCallback((deltaRad: number) => {
    setBraceletRevolveRad((previous) => previous + deltaRad);
  }, []);

  const perforatedBeadGeometry = useMemo(() => createPerforatedBeadGeometry(), []);
  const perforatedLetterBeadGeometry = useMemo(() => createPerforatedLabelBeadGeometry(), []);

  const lastBraceletResetTokenRef = useRef(0);
  useEffect(() => {
    if (orbitResetToken === 0 || orbitResetToken === lastBraceletResetTokenRef.current) {
      return;
    }
    lastBraceletResetTokenRef.current = orbitResetToken;
    setBraceletRevolveRad(0);
  }, [orbitResetToken]);

  useEffect(() => {
    return () => {
      perforatedBeadGeometry.dispose();
      perforatedLetterBeadGeometry.dispose();
    };
  }, [perforatedBeadGeometry, perforatedLetterBeadGeometry]);

  const ringRadius = useMemo(() => braceletRingRadius(beads.length), [beads.length]);
  const strandTubeRadius = useMemo(() => braceletStrandTubeRadius(beads.length), [beads.length]);
  const points = useMemo(() => getRingPoints(beads.length, ringRadius), [beads.length, ringRadius]);
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

  const braceletSpinZ = braceletRevolveRad;
  const braceletEntranceGroupRef = useRef<THREE.Group>(null);
  const effectiveAnchorContainerRef = anchorContainerRef ?? nullAnchorContainerRef;
  const [hoveredBeadId, setHoveredBeadId] = useState<string | null>(null);

  return (
    <div
      className="relative h-full min-h-0 w-full"
      onPointerLeave={() => {
        setHoveredBeadId(null);
        onHoveredBeadMeta?.(null);
      }}
    >
      <Canvas
        shadows={useCanvasShadows}
        dpr={canvasDpr}
        frameloop="demand"
        className="block h-full w-full touch-none"
        gl={{ alpha: true, antialias: !isMemoryConstrained, powerPreference: "low-power", stencil: false }}
        style={{ background: "transparent" }}
        onPointerMissed={(event) => {
          if (!editingEnabled) {
            return;
          }
          if (event.shiftKey === false) {
            onClearSelection();
          }
        }}
      >
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

        {editingEnabled ? (
          <group ref={braceletEntranceGroupRef}>
            <KandiBraceletStageMeshes
              beads={beads}
              selectedIds={selectedIds}
              braceletSpinRad={braceletSpinZ}
              interactive
              ringRadius={ringRadius}
              strandTubeRadius={strandTubeRadius}
              torusRadialSegments={torusRadialSegments}
              torusTubularSegments={torusTubularSegments}
              points={points}
              perforatedBeadGeometry={perforatedBeadGeometry}
              perforatedLetterBeadGeometry={perforatedLetterBeadGeometry}
              useShadows={useCanvasShadows}
              anchorContainerRef={effectiveAnchorContainerRef}
              hoveredBeadId={hoveredBeadId}
              setHoveredBeadId={setHoveredBeadId}
              onHoveredBeadMeta={onHoveredBeadMeta}
              onBeadClick={onBeadClick}
            />
          </group>
        ) : null}

        <CameraRig />
        {editingEnabled ? <BraceletEntranceMotion groupRef={braceletEntranceGroupRef} /> : null}
        <ResetOrbitEffect orbitResetToken={orbitResetToken} />
        <GuidedCameraSmoothDrive
          guidedPreset={guidedPreset}
          guidedElevationDeg={guidedElevationDeg}
          orbitResetToken={orbitResetToken}
        />
        {editingEnabled ? (
          <GuidedBraceletStepEffect
            guidedRotateTick={guidedRotateTick}
            guidedRotateDeltaDeg={guidedRotateDeltaDeg}
            onRevolveDeltaRad={applyBraceletRevolveDelta}
          />
        ) : null}
        {editingEnabled ? <GuidedBraceletDragRevolve onRevolveDeltaRad={applyBraceletRevolveDelta} /> : null}
        {editingEnabled && onFocusComplete ? (
          <BraceletFocusToFrontDrive
            pendingFocusBeadId={pendingFocusBeadId}
            beads={beads}
            points={points}
            braceletRevolveRad={braceletSpinZ}
            onRevolveDeltaRad={applyBraceletRevolveDelta}
            onFocusComplete={onFocusComplete}
          />
        ) : null}
        {editingEnabled ? (
          <ActiveBeadMetaDrive
            activeBeadId={activeBeadId}
            beads={beads}
            points={points}
            braceletRevolveRad={braceletSpinZ}
            ringRadius={ringRadius}
            anchorContainerRef={effectiveAnchorContainerRef}
            onActiveBeadMeta={onActiveBeadMeta}
          />
        ) : null}
      </Canvas>
    </div>
  );
}
