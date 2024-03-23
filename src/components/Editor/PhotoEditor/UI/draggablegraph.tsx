import * as React from "react";
import {
  Coordinates,
  Plot,
  Line,
  Mafs,
  Point,
  Theme,
  useMovablePoint,
  useStopwatch,
  vec,
  Polygon,
  PolygonProps,
  UseMovablePoint,
  LaTeX,
} from "mafs";
import { easeInOutCubic } from "js-easing-functions";
import { Vector2 } from "@use-gesture/react";
import LuminanceHistogram from "./histogram";
import _ from "lodash";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AdjustmentLayer, HistogramArray } from "@/utils/editorInterfaces";

function inPairs<T>(arr: T[]) {
  const pairs: [T, T][] = [];
  for (let i = 0; i < arr.length - 1; i++) {
    pairs.push([arr[i], arr[i + 1]]);
  }

  return pairs;
}

interface BezierCurvesProps {
  histogramData: HistogramArray;
}

const BezierCurves: React.FC<BezierCurvesProps> = ({ histogramData }) => {
  const [t, setT] = React.useState(0.5);
  const opacity = 1 - (2 * t - 1) ** 6;

  const p1: Vector2 = [0, 0];

  const p2: Vector2 = [10, 10];

  const c1 = useMovablePoint([3, 3]);
  const c2 = useMovablePoint([5, 5]);

  const lerp1 = vec.lerp(p1, c1.point, t);
  const lerp2 = vec.lerp(c1.point, c2.point, t);
  const lerp3 = vec.lerp(c2.point, p2, t);

  const lerp12 = vec.lerp(lerp1, lerp2, t);
  const lerp23 = vec.lerp(lerp2, lerp3, t);

  const lerpBezier = vec.lerp(lerp12, lerp23, t);

  const duration = 2;
  const { time, start } = useStopwatch({
    endTime: duration,
  });

  /**
   * Given the four control points, calculate
   * the xy position of the bezier curve at value t.
   * See https://youtu.be/aVwxzDHniEw?t=265
   */

  interface FrequencyObject {
    [key: number]: number;
  }
  const [frequencyObject, setFrequencyObject] = React.useState<FrequencyObject>(
    {}
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const verify = React.useCallback(
    _.debounce((c1: UseMovablePoint, c2: UseMovablePoint, tMax: number) => {
      const newFrequencyObject: FrequencyObject = {};

      for (let t = 0; t < tMax; t += 0.001) {
        const xValue =
          (1 - t) ** 3 * p1[0] +
          3 * (1 - t) ** 2 * t * c1.point[0] +
          3 * (1 - t) * t ** 2 * c2.point[0] +
          t ** 3 * p2[0];

        const luminance =
          (1 - t) ** 3 * p1[1] +
          3 * (1 - t) ** 2 * t * c1.point[1] +
          3 * (1 - t) * t ** 2 * c2.point[1] +
          t ** 3 * p2[1];
        // Consider that the x-axis is 0-10, and the luminance is 0-255. The y-axis is also 0-10 but the luminance is 0-255. So we need to scale the luminance to fit the y-axis.
        const scaledLuminance = (255 / 10) * luminance;
        const scaledBin = (255 / 10) * xValue;
        // Frequency object stores from 0-255, so we need to fix the scaledBin to be an integer
        const integerScaledBin = Math.floor(scaledBin);
        const integerScaledLuminance = Math.floor(scaledLuminance);
        // Only set if this bin value hasn't been set yet or has changed
        newFrequencyObject[integerScaledBin] = integerScaledLuminance;
      }
      setFrequencyObject(newFrequencyObject);
    }, 100),
    []
  );

  React.useEffect(() => {
    verify(c1, c2, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c1.point[0], c1.point[1], c2.point[0], c2.point[1], t]);

  React.useEffect(() => {}, [frequencyObject]);

  function xyFromBernsteinPolynomial(
    p1: vec.Vector2,
    c1: vec.Vector2,
    c2: vec.Vector2,
    p2: vec.Vector2,
    t: number
  ) {
    return [
      vec.scale(p1, -(t ** 3) + 3 * t ** 2 - 3 * t + 1),
      vec.scale(c1, 3 * t ** 3 - 6 * t ** 2 + 3 * t),
      vec.scale(c2, -3 * t ** 3 + 3 * t ** 2),
      vec.scale(p2, t ** 3),
    ].reduce(vec.add, [0, 0]);
  }

  React.useEffect(() => {
    setTimeout(() => start(), 500);
  }, [start]);
  React.useEffect(() => {
    setT(easeInOutCubic(time, 0, 1, duration));
  }, [time]);

  function drawLineSegments(
    pointPath: vec.Vector2[],
    color: string,
    customOpacity = opacity * 0.5
  ) {
    return inPairs(pointPath).map(([p1, p2], index) => (
      <Line.Segment
        key={index}
        point1={p1}
        point2={p2}
        opacity={customOpacity}
        color={color}
      />
    ));
  }

  function drawPoints(points: vec.Vector2[], color: string) {
    return points.map((point, index) => (
      <Point
        key={index}
        x={point[0]}
        y={point[1]}
        color={color}
        opacity={opacity}
      />
    ));
  }

  function isOdd(n: number) {
    return ((n % 2) + 2) % 2 === 0;
  }

  interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  const [rects, setRects] = React.useState<Rect[]>([]);
  const [showLerpingPoints, setShowLerpingPoints] = React.useState(true);

  const convertLuminanceToRects = React.useMemo(() => {
    return (binEdges: number[], frequencies: number[]) => {
      // Convert binEdges and frequencies to regular arrays
      const binEdgesArray = Array.from(binEdges);
      const frequenciesArray = Array.from(frequencies);

      // Max height of rectangle is 10, luminance values are 0-255
      // Scale the frequency to the height of the canvas
      // The x-axis is also scaled to fit the canvas

      // Convert the bins to the x-axis, 1-10
      const rects = binEdgesArray.map((binEdge, i) => {
        const x = (binEdge / 255) * 10;
        const width = (binEdgesArray[i + 1] - binEdge) / 255;
        const height =
          (frequenciesArray[i] / Math.max(...frequenciesArray)) * 10;
        return { x, y: height, width, height };
      });
      return rects;
    };
  }, []);

  React.useEffect(() => {
    // Call the memoized function to calculate rects
    const rects = convertLuminanceToRects(
      histogramData.luminance.bins,
      histogramData.luminance.frequencies
    );
    setRects(rects);
  }, [histogramData, convertLuminanceToRects]);
  return (
    <div className="w-72 ">
      <Mafs
        viewBox={{ x: [0, 10], y: [0, 10], padding: 0.5 }}
        pan={false}
        height={310}
        zoom={false}
      >
        {rects.map((rect, i) => (
          <Polygon
            key={i}
            points={[
              [rect.x, 0],
              [rect.x, rect.y],
            ]}
            color={"hsl(204, 8%, 76%)"}
          ></Polygon>
        ))}

        {/* <Coordinates.Cartesian
          xAxis={{ labels: (n) => (isOdd(n) ? n : ""), axis: true }}
          yAxis={{ labels: false, axis: true }}
        /> */}

        {/* Control lines */}
        {showLerpingPoints && (
          <>
            {drawLineSegments([p1, c1.point, c2.point, p2], Theme.pink, 0.5)}
            {drawLineSegments([lerp1, lerp2, lerp3], Theme.red)}
            {drawPoints([lerp1, lerp2, lerp3], Theme.red)}
            {drawLineSegments([lerp12, lerp23], Theme.yellow)}
            {drawPoints([lerp12, lerp23], Theme.yellow)}
          </>
        )}

        {/* Quadratic bezier lerp  */}
        <Plot.Parametric
          t={[0, t]}
          weight={4}
          xy={(t) => xyFromBernsteinPolynomial(p1, c1.point, c2.point, p2, t)}
        />
        {/* Show remaining bezier with dashed line  */}
        <Plot.Parametric
          // Iterate backwards so that dashes don't move
          t={[1, t]}
          weight={3}
          opacity={0.5}
          style="dashed"
          xy={(t) => xyFromBernsteinPolynomial(p1, c1.point, c2.point, p2, t)}
        />

        {drawPoints([lerpBezier], Theme.foreground)}

        {/* {p1.element}
        {p2.element} */}
        {c1.element}
        {c2.element}
      </Mafs>

      {/* These classnames are part of the Mafs docs website—they won't work for you. */}
      <div className="p-4 border-gray-700 border-t bg-black text-white flex flex-col space-y-3 justify-center items-center">
        <div className="flex flex-row space-x-2">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="6.536px"
              height="11.528px"
              viewBox="0 -626 361 637"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              aria-hidden="true"
            >
              <defs>
                <path
                  id="MJX-20-TEX-I-1D461"
                  d="M26 385Q19 392 19 395Q19 399 22 411T27 425Q29 430 36 430T87 431H140L159 511Q162 522 166 540T173 566T179 586T187 603T197 615T211 624T229 626Q247 625 254 615T261 596Q261 589 252 549T232 470L222 433Q222 431 272 431H323Q330 424 330 420Q330 398 317 385H210L174 240Q135 80 135 68Q135 26 162 26Q197 26 230 60T283 144Q285 150 288 151T303 153H307Q322 153 322 145Q322 142 319 133Q314 117 301 95T267 48T216 6T155 -11Q125 -11 98 4T59 56Q57 64 57 83V101L92 241Q127 382 128 383Q128 385 77 385H26Z"
                ></path>
              </defs>
              <g
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                transform="scale(1,-1)"
              >
                <g data-mml-node="math">
                  <g data-mml-node="mi">
                    <use data-c="1D461" xlinkHref="#MJX-20-TEX-I-1D461"></use>
                  </g>
                </g>
              </g>
            </svg>
          </div>

          <input
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={t}
            onChange={(event) => setT(+event.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="airplane-mode"
            checked={showLerpingPoints}
            onCheckedChange={() => setShowLerpingPoints(!showLerpingPoints)}
          />
          <Label htmlFor="airplane-mode">Show Interpolation</Label>
        </div>
      </div>
    </div>
  );
};
export default BezierCurves;
