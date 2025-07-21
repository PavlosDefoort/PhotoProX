import { Progress } from "@/components/ui/progress";
import { Hourglass } from "react-loader-spinner";

interface LoadingProps {
  isLoadingBar: boolean;
  progressValue: number;
  loading: boolean;
  task: "compressing" | "regular";
}

interface CompressProps {
  progressValue: number;
  loading: boolean;
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

const Loading: React.FC<LoadingProps> = ({
  isLoadingBar,
  progressValue,
  loading,
  task,
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
    </div>
  );
};

export default Loading;
