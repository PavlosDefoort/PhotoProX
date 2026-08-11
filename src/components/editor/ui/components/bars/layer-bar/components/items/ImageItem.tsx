import { ImageLayer } from "@/models/project/Layers/Layers";

interface ImageLayerBarItemProps {
  layer: ImageLayer;
}

export const ImageLayerBarItem: React.FC<ImageLayerBarItemProps> = ({
  layer,
}) => {
  return (
    <div className="flex flex-row items-center justify-between">
      <div className="border border-slate-300 w-12 h-12 bg-black flex justify-center items-center shrink-0">
        <div
          className="w-11 h-11 aspect-square relative"
          style={{
            background:
              "repeating-conic-gradient(#808080 0% 25%, #fafafa 0% 50%) 50% / 10px 10px",
          }}
        >
          {"imageData" in layer && (
            <img
              src={(layer as ImageLayer).imageData.src as string}
              alt="image layer preview"
              className="object-contain w-full h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
};
export default ImageLayerBarItem;
