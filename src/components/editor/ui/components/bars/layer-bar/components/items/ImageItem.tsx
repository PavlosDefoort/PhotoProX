import { ImageLayer } from "@/models/project/Layers/Layers";

interface ImageLayerBarItemProps {
  layer: ImageLayer;
}

export const ImageLayerBarItem: React.FC<ImageLayerBarItemProps> = ({
  layer,
}) => {
  return (
    <div className="flex flex-row items-center justify-between space-x-4">
      <div className="border-[1px] border-slate-300 w-40 h-40 bg-black flex justify-center items-center">
        <div
          className="w-36 h-36 aspect-square relative "
          style={{
            background:
              "repeating-conic-gradient(#808080 0% 25%, #fafafa 0% 50%) 50% / 20px 20px",
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
