import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

import { BEAD_HOLE_HALF_LENGTH, BEAD_HOLE_RADIAL_SEGMENTS, BEAD_HOLE_RADIUS } from "./beadHoleConstants";

/**
 * Lightweight kandi pony bead profile:
 * - short, chunky barrel silhouette (wider than tall)
 * - softly bulged side wall
 * - broad, beveled through-hole
 */

const OUTER_RADIUS = 0.3;
const HEIGHT = 0.6;
const BODY_RADIUS = 0.24;
const BODY_BARREL_LENGTH = 0.6;
const BODY_CAP_SEGMENTS = 8;
const BODY_RADIAL_SEGMENTS = 22;

export function createPerforatedBeadGeometry(): THREE.BufferGeometry {
  const evaluator = new Evaluator();
  evaluator.useGroups = true;

  const barrelBrush = new Brush(
    createRoundedBarrelBodyGeometry(),
    new THREE.MeshStandardMaterial({
      polygonOffset: true,
      polygonOffsetUnits: 1,
      polygonOffsetFactor: 1,
    }),
  );

  const cylinderBrush = new Brush(
    createCylindricalHoleCutterGeometry(),
    new THREE.MeshStandardMaterial({
      polygonOffset: true,
      polygonOffsetUnits: 1,
      polygonOffsetFactor: 1,
    }),
  );

  cylinderBrush.updateMatrixWorld(true);
  barrelBrush.updateMatrixWorld(true);

  const evaluated = evaluator.evaluate(barrelBrush, cylinderBrush, SUBTRACTION);

  const geometry = evaluated.geometry.clone();
  disposeBrushGeometryAndMaterial(barrelBrush);
  disposeBrushGeometryAndMaterial(cylinderBrush);
  disposeBrushGeometryAndMaterial(evaluated);

  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}

function createRoundedBarrelBodyGeometry(): THREE.BufferGeometry {
  // Capsule body reads as a short barrel while keeping one continuous molded surface.
  const geometry = new THREE.CapsuleGeometry(
    BODY_RADIUS,
    BODY_BARREL_LENGTH,
    BODY_CAP_SEGMENTS,
    BODY_RADIAL_SEGMENTS,
  );

  // Normalize to target proportions (~1.0 diameter, ~0.6 height).
  const baseHeight = BODY_RADIUS * 2 + BODY_BARREL_LENGTH;
  const xyScale = OUTER_RADIUS / BODY_RADIUS;
  const yScale = HEIGHT / baseHeight;
  geometry.scale(xyScale, yScale, xyScale);
  return geometry;
}

function createCylindricalHoleCutterGeometry(): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(
    BEAD_HOLE_RADIUS,
    BEAD_HOLE_RADIUS,
    BEAD_HOLE_HALF_LENGTH * 2,
    BEAD_HOLE_RADIAL_SEGMENTS,
  );
}

function disposeBrushGeometryAndMaterial(brush: { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[] }): void {
  brush.geometry.dispose();
  const mats = brush.material;
  if (Array.isArray(mats)) {
    mats.forEach((m) => m.dispose());
  } else if (mats) {
    mats.dispose();
  }
}
