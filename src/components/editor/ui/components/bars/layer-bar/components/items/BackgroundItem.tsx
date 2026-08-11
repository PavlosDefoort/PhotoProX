import { BackgroundLayer } from "@/models/project/Layers/Layers";

interface BackgroundLayerBarItemProps {
  layer: BackgroundLayer;
}

const BackgroundLayerBarItem: React.FC<BackgroundLayerBarItemProps> = ({
  layer,
}) => {
  const transparentStyle = {
    background:
      "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px",
  };

  const nonTransparentStyle = {
    backgroundColor: layer.color,
    opacity: layer.opacity,
  };

  const currentStyle =
    layer.opacity === 0 ? transparentStyle : nonTransparentStyle;

  return (
    <div className="flex flex-row items-center justify-between">
      <div
        className="w-12 h-12 aspect-square relative shrink-0 border border-slate-300"
        style={currentStyle}
      ></div>
    </div>
  );
};

export default BackgroundLayerBarItem;
