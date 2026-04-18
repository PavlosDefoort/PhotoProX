import { Progress } from "@/components/ui/progress";
import { Hourglass } from "react-loader-spinner";

interface LoadingProps {
  isLoadingBar: boolean;
  progressValue: number;
  loading: boolean;
  task: "compressing" | "regular" | "inpainting";
  progressText?: string;
}

interface CompressProps {
  progressValue: number;
  loading: boolean;
}

interface InpaintProps {
  progressValue: number;
  loading: boolean;
  progressText?: string;
}

const CompressingLoading: React.FC<CompressProps> = ({
  progressValue,
  loading,
}) => {
  return (
    <div className="h-52 w-72 flex flex-col space-y-5 justify-center items-center text-black dark:text-white bg-white dark:bg-black rounded-lg">
      <Hourglass visible={loading} width={60} height={60} />
      <div className="flex flex-col items-center">
        <h1 className="text-xl text-black dark:text-white ">Compressing...</h1>
        <p className="text-sm text-gray-700 dark:text-slate-300 ">
          Please sit back and relax.
        </p>
      </div>
      <div className="flex flex-row space-x-10">
        <div className="w-40 space-x-5 flex flex-row">
          <Progress value={progressValue} max={100} />
          <p className="text-black dark:text-white text-sm">{progressValue}%</p>
        </div>
      </div>
    </div>
  );
};

const InpaintingLoading: React.FC<InpaintProps> = ({
  progressValue,
  loading,
  progressText,
}) => {
  return (
    <div className="h-60 w-80 flex flex-col space-y-5 justify-center items-center text-black dark:text-white bg-white dark:bg-black rounded-lg">
      <Hourglass visible={loading} width={60} height={60} />
      <div className="flex flex-col items-center">
        <h1 className="text-xl text-black dark:text-white">Inpainting...</h1>
        <p className="text-sm text-gray-700 dark:text-slate-300">
          AI is generating your image.
        </p>
      </div>
      <div className="flex flex-col items-center space-y-2 w-full px-6">
        <div className="w-full space-x-3 flex flex-row items-center">
          <Progress value={progressValue} max={100} className="flex-1" />
          <p className="text-black dark:text-white text-sm w-10">
            {progressValue}%
          </p>
        </div>
        {progressText && (
          <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
            {progressText}
          </p>
        )}
      </div>
    </div>
  );
};

const Loading: React.FC<LoadingProps> = ({
  isLoadingBar,
  progressValue,
  loading,
  task,
  progressText,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{ pointerEvents: "none", zIndex: 1000 }}
    >
      {task === "regular" && (
        <div className="h-52 w-72 flex flex-col space-y-5 justify-center items-center text-black dark:text-white bg-white dark:bg-black rounded-lg">
          <Hourglass visible={loading} width={60} height={60} />
          <div>
            {" "}
            <h1 className="text-xl text-black dark:text-white ">
              Processing...
            </h1>
          </div>
        </div>
      )}
      {task === "compressing" && (
        <CompressingLoading loading={loading} progressValue={progressValue} />
      )}
      {task === "inpainting" && (
        <InpaintingLoading
          loading={loading}
          progressValue={progressValue}
          progressText={progressText}
        />
      )}
    </div>
  );
};

export default Loading;
