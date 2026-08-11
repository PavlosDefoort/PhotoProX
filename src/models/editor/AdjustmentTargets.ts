import { AdjustmentLayer, ImageLayer, LayerX } from "../project/Layers/Layers";

export const getAdjustmentTargets = (
  adjustment: AdjustmentLayer,
  layers: LayerX[],
): ImageLayer[] => {
  if (!adjustment.clipToBelow) {
    return layers.filter(
      (layer) =>
        layer instanceof ImageLayer && layer.zIndex < adjustment.zIndex,
    ) as ImageLayer[];
  }

  const below = layers
    .filter((layer) => layer.zIndex < adjustment.zIndex)
    .sort((a, b) => b.zIndex - a.zIndex);
  const nearestImage = below.find(
    (layer) => layer instanceof ImageLayer,
  ) as ImageLayer | undefined;
  const nearestAdjustment = below.find(
    (layer) => layer instanceof AdjustmentLayer,
  ) as AdjustmentLayer | undefined;

  if (nearestImage && nearestAdjustment) {
    return nearestImage.zIndex > nearestAdjustment.zIndex
      ? [nearestImage]
      : nearestAdjustment.clipToBelow
        ? getAdjustmentTargets(nearestAdjustment, layers)
        : [nearestImage];
  }
  if (nearestImage) return [nearestImage];
  return nearestAdjustment?.clipToBelow
    ? getAdjustmentTargets(nearestAdjustment, layers)
    : [];
};

export const getAdjustmentsForImage = (
  image: ImageLayer,
  layers: LayerX[],
) =>
  layers
    .filter((layer) => layer instanceof AdjustmentLayer)
    .filter((layer) =>
      getAdjustmentTargets(layer as AdjustmentLayer, layers).some(
        (target) => target.id === image.id,
      ),
    )
    .sort((a, b) => a.zIndex - b.zIndex) as AdjustmentLayer[];
