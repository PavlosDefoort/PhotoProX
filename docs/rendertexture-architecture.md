# Zynalo RenderTexture Architecture

## Purpose

This document explains the RenderTexture architecture used by the editor, why it exists, and how data and transforms flow through the system.

Primary implementation:

- [src/utils/PixiUtils.ts](../src/utils/PixiUtils.ts)
- [src/models/pixi-extends/SpriteX.ts](../src/models/pixi-extends/SpriteX.ts)
- [src/components/editor/tasks/MovementLogic.tsx](../src/components/editor/tasks/MovementLogic.tsx)

## Problem It Solves

The previous direct-render approach could show border artifacts while zooming filtered content. Filters can allocate intermediate textures at rounded dimensions while transforms are fractional, which can expose 1px seams at some zoom levels.

RenderTexture architecture fixes this by separating:

- content compositing (done offscreen at fixed document resolution), and
- viewport interaction (zoom/pan applied to a single display sprite).

## High-Level Model

The architecture uses three objects on each project canvas:

1. `container` (`ContainerX`):

   - Holds checkerboard, mask, and all layer display objects.
   - Used for event hit testing and interaction state.
   - Usually `renderable = false` on stage.

2. `renderTexture`:

   - Offscreen texture with document dimensions.
   - Receives composited output from the container.

3. `displaySprite`:
   - A sprite backed by `renderTexture`.
   - Added to stage for visible output.
   - Receives zoom/pan transforms in normal interaction.

## Stage Composition

The stage is organized as:

```text
app.stage
  ├─ displaySprite (visible, eventMode=none)
  └─ container (renderable=false, interaction/hit-testing)
       ├─ checkerboard
       ├─ mask
       └─ image/background layer objects
```

This setup is established by `addContainerToStage` in [src/utils/PixiUtils.ts](../src/utils/PixiUtils.ts).

## Core Composite Routine

`compositeToRT(renderer, container)` performs the key operation:

1. Save current interactive transform (`scale`, `x`, `y`).
2. Temporarily force identity document mapping on the container:
   - `scale = 1`
   - `x = pivot.x`
   - `y = pivot.y`
   - `renderable = true`
3. Render container into `renderTexture` with `clear: true`.
4. Restore previous interactive transform and `renderable = false`.

Code location:

- [src/utils/PixiUtils.ts](../src/utils/PixiUtils.ts)

## Why the Identity Transform Works

With Pixi pivot transforms, screen projection is:

$$
s = p + (l - o)z
$$

where:

- $l$ is local point,
- $o$ is pivot,
- $p$ is container position,
- $z$ is scale.

During composite, we set $z = 1$ and $p = o$. Then:

$$
s = o + (l - o) = l
$$

So local document coordinates map 1:1 to render target pixels, which removes zoom-dependent filter seam behavior.

## Runtime Flow

### 1) Creation

- `createContainerBM` creates `ContainerX`, checkerboard, mask, `RenderTexture`, and `displaySprite`.
- `addContainerToStage` adds sprite + container to stage and performs initial composite.

References:

- [src/utils/PixiUtils.ts](../src/utils/PixiUtils.ts)

### 2) Layer updates

- `renderLayers` updates child visibility/effects and mode behavior.
- `UpdateCanvas` marks `container.compositeNeeded = true` after render changes.

References:

- [src/components/editor/tasks/RenderLayers.tsx](../src/components/editor/tasks/RenderLayers.tsx)
- [src/components/editor/tasks/UpdateCanvas.tsx](../src/components/editor/tasks/UpdateCanvas.tsx)

### 3) Interaction loop

- `MovementLogic` keeps `displaySprite` transform synchronized to `container` transform.
- If `compositeNeeded || alwaysComposite`, it runs `compositeToRT` and clears `compositeNeeded`.

Reference:

- [src/components/editor/tasks/MovementLogic.tsx](../src/components/editor/tasks/MovementLogic.tsx)

### 4) Paint-mode behavior

- In inpaint/rembg workflows, `container.alwaysComposite` is enabled for continuous visual updates.

Reference:

- [src/components/editor/tasks/RenderLayers.tsx](../src/components/editor/tasks/RenderLayers.tsx)

### 5) Direct transform callers

Some tools set container transforms directly and must also sync `displaySprite`.

References:

- [src/components/editor/ui/components/bars/tool-bar/tools/artificial-intelligence/Inpaint.tsx](../src/components/editor/ui/components/bars/tool-bar/tools/artificial-intelligence/Inpaint.tsx)
- [src/components/editor/ui/components/bars/top-bar/navigation/project-dropdown/components/ResizeProject.tsx](../src/components/editor/ui/components/bars/top-bar/navigation/project-dropdown/components/ResizeProject.tsx)

### 6) Export path

`exportProjectImage` temporarily sets `container.renderable = true` to extract final output from the logical container, then restores the prior state.

Reference:

- [src/utils/PixiUtils.ts](../src/utils/PixiUtils.ts)

## Data Fields on ContainerX

`ContainerX` extends Pixi `Container` with architecture state:

- `displaySprite: Sprite | null`
- `renderTexture: RenderTexture | null`
- `compositeNeeded: boolean`
- `alwaysComposite: boolean`

Reference:

- [src/models/pixi-extends/SpriteX.ts](../src/models/pixi-extends/SpriteX.ts)

## Invariants

Keep these true to avoid visual bugs:

1. `displaySprite` and `container` must share the same position and scale in interaction code paths.
2. `container.renderable` must remain `false` except during composite/export.
3. Any operation that changes visible content (layers, filters, geometry, paint strokes) must set `compositeNeeded = true` or use `alwaysComposite`.
4. Composite pass must restore transform state after rendering to RT.

## Performance Characteristics

Benefits:

- Zoom/pan is cheap: only transform updates on one sprite.
- Filter cost is mostly paid when content changes, not on every viewport change.
- Dirty-flag model prevents unnecessary offscreen renders.

Tradeoffs:

- Requires strict transform synchronization between two scene objects.
- Adds one extra offscreen render target and pass.
- Tools that bypass central movement logic must manually sync `displaySprite`.

## Maintenance Checklist

When adding a new feature that changes visuals:

1. Update layer/container content.
2. Mark `compositeNeeded = true` (or use `alwaysComposite` for continuous updates).
3. If setting transforms directly, update both `container` and `displaySprite`.
4. Ensure export behavior still renders the logical container correctly.
