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
    <div className="flex flex-row items-center justify-between space-x-4">
      <div
        className={`w-40 h-40 aspect-square relative `}
        style={currentStyle}
      ></div>
    </div>
  );
};

export default BackgroundLayerBarItem;
