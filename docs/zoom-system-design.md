# Zynalo Zoom System Design

## Overview

This document describes how zoom and pan are implemented in the editor, with emphasis on cursor-anchored zoom precision.

Primary implementation file:

- src/components/editor/tasks/MovementLogic.tsx

Related rendering architecture:

- src/utils/PixiUtils.ts (RenderTexture compositing)

## Goals

- Keep zoom centered exactly under the mouse cursor.
- Support smooth programmatic zoom and pan transitions.
- Avoid filter edge artifacts by using the RenderTexture architecture.
- Keep zoom and pan responsive under rapid wheel input.

## Coordinate Spaces

The zoom math uses three spaces:

- Screen space: mouse position in canvas pixels, S = (sx, sy)
- Container local space: image point coordinates, L = (lx, ly)
- Container transform state:
  - Position P = (x, y)
  - Uniform scale z
  - Pivot O = (px, py)

Because the container pivot is not zero (it is centered), pivot-aware formulas are required.

## Core Projection Math

Forward projection (local to screen):

$$
sx = x + (lx - px)z
$$

$$
sy = y + (ly - py)z
$$

Inverse projection (screen to local):

$$
lx = \frac{sx - x}{z} + px
$$

$$
ly = \frac{sy - y}{z} + py
$$

These equations are the basis of precise cursor-anchored zoom.

## Wheel Input to Zoom Mapping

Wheel delta is normalized across input modes:

- deltaMode 0 (pixels): multiplier = 1
- deltaMode 1 (lines): multiplier = 16
- deltaMode 2 (pages): multiplier = canvas height

Normalized wheel delta:

$$
d = \Delta y \cdot m
$$

Continuous zoom factor:

$$
f = e^{-ds}
$$

where s is zoomSensitivity (currently 0.0015).

Target zoom:

$$
z' = clamp(z_{base}f, z_{min}, z_{max})
$$

Current limits:

- z_min = 0.05
- z_max = 5.0

## Strict Cursor-Anchored Wheel Zoom

For ctrl+wheel zoom, the system now applies exact anchored projection immediately in the wheel handler:

1. Read mouse in screen space.
2. Convert mouse to local point using current transform.
3. Compute new zoom z'.
4. Solve new container position so the same local point stays under the same mouse pixel:

$$
x' = sx - (lx - px)z'
$$

$$
y' = sy - (ly - py)z'
$$

5. Apply x', y', z' to container and display sprite immediately.
6. Sync shared refs and state:
   - targetPosition
   - currentZoomRef
   - targetZoomRef
   - setTargetZoom
   - setCurrentZoom

### Why this guarantees precision

Substitute x' into forward projection:

$$
sx' = x' + (lx - px)z' = [sx - (lx - px)z'] + (lx - px)z' = sx
$$

Likewise for y. Therefore the projected point under the cursor is invariant during the zoom step.

## Animation Loop Responsibilities

The requestAnimationFrame loop still handles smooth motion for:

- Programmatic zoom updates
- Pan lerp toward targetPosition
- Final convergence and threshold snapping

Programmatic zoom uses log-space interpolation:

$$
z_{next} = exp(log(z_{cur}) + (log(z_{target}) - log(z_{cur}))\alpha)
$$

where alpha is zoomSpeed (currently 0.4).

Pan interpolation:

$$
x_{next} = x + (x_t - x)\beta
$$

$$
y_{next} = y + (y_t - y)\beta
$$

where beta is panSpeed (currently 0.3).

Convergence thresholds:

- zoomThreshold = 0.0005
- panThreshold = 0.05

## RenderTexture Interaction

Zoom and pan apply transforms to both:

- container (event and interaction layer)
- displaySprite (visible composited image)

Compositing into RenderTexture is not done on every zoom/pan frame. It is triggered only when:

- container.compositeNeeded is true, or
- container.alwaysComposite is true

This keeps interaction fast while preserving artifact-free filtered output.

## State and Data Flow Summary

- Wheel input updates zoom and transform immediately for cursor-precision.
- Animation loop keeps long-running transitions smooth.
- Shared refs prevent stale closure issues:
  - currentZoomRef
  - targetZoomRef
- React state remains authoritative for UI display and external controls.

## Key Invariants

- Cursor lock invariant: the local point selected under the cursor remains under the same screen pixel during ctrl+wheel steps.
- Pivot correctness invariant: all projection math includes pivot terms.
- Transform sync invariant: displaySprite transform matches container transform.
- Performance invariant: zoom and pan do not force unnecessary compositing.

## Tuning Notes

Current tuning constants are in MovementLogic:

- zoomSensitivity: 0.0015
- zoomSpeed: 0.4
- panSpeed: 0.3
- zoomThreshold: 0.0005
- panThreshold: 0.05

If interaction feels too aggressive, reduce zoomSensitivity. If it feels sluggish for non-wheel transitions, increase zoomSpeed.
