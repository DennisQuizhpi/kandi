import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

import { BEAD_HOLE_HALF_LENGTH, BEAD_HOLE_RADIAL_SEGMENTS, BEAD_HOLE_RADIUS } from "./beadHoleConstants";

/** Rounded box (hole along local Y): four lateral faces ±X / ±Z are “non-hole” for lettering. */

const BOX_WIDTH = 0.58;
const BOX_HEIGHT_Y = 0.56;
const BOX_DEPTH = 0.58;

const ROUND_SEGMENTS = 3;
const CORNER_RADIUS = 0.09;

/** Half-extent toward ±X / ±Z from center for lettering (surface + bleed). */
export const LABEL_BEAD_SURFACE_OFFSET_XZ = BOX_WIDTH / 2 + 0.006;

export function createPerforatedLabelBeadGeometry(): THREE.BufferGeometry {
  const evaluator = new Evaluator();
  evaluator.useGroups = true;

  const roundedBrush = new Brush(
    new RoundedBoxGeometry(BOX_WIDTH, BOX_HEIGHT_Y, BOX_DEPTH, ROUND_SEGMENTS, CORNER_RADIUS),
    new THREE.MeshStandardMaterial({
      polygonOffset: true,
      polygonOffsetUnits: 1,
      polygonOffsetFactor: 1,
    }),
  );

  const cylinderBrush = new Brush(
    new THREE.CylinderGeometry(BEAD_HOLE_RADIUS, BEAD_HOLE_RADIUS, BEAD_HOLE_HALF_LENGTH * 2, BEAD_HOLE_RADIAL_SEGMENTS),
    new THREE.MeshStandardMaterial({
      polygonOffset: true,
      polygonOffsetUnits: 1,
      polygonOffsetFactor: 1,
    }),
  );

  cylinderBrush.updateMatrixWorld(true);
  roundedBrush.updateMatrixWorld(true);

  const evaluated = evaluator.evaluate(roundedBrush, cylinderBrush, SUBTRACTION);

  const geometry = evaluated.geometry.clone();
  disposeBrushGeometryAndMaterial(roundedBrush);
  disposeBrushGeometryAndMaterial(cylinderBrush);
  disposeBrushGeometryAndMaterial(evaluated);

  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
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
