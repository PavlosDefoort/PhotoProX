import { Label } from "@/components/ui/label";
import { ComputeEngine } from "@cortex-js/compute-engine";
import { MathfieldElement } from "mathlive";
import React, { useCallback, useEffect, useRef, useState } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<MathfieldElement>,
        MathfieldElement
      >;
    }
  }
}

interface LiveMathProps {
  blueMathData: string;
  redMathData: string;
  greenMathData: string;
  setBlueMathData: (value: string) => void;
  setRedMathData: (value: string) => void;
  setGreenMathData: (value: string) => void;
  id: string;
}

const LiveMath: React.FC<LiveMathProps> = ({
  blueMathData,
  redMathData,
  greenMathData,
  setBlueMathData,
  setGreenMathData,
  setRedMathData,
  id,
}) => {
  const blueFieldRef = useRef<MathfieldElement>(null);
  const redFieldRef = useRef<MathfieldElement>(null);
  const greenFieldRef = useRef<MathfieldElement>(null);
  const computeEngine = useRef<ComputeEngine | null>(null);

  const [greenFocus, setGreenFocus] = useState<boolean>(false);
  const [redFocus, setRedFocus] = useState<boolean>(false);
  const [blueFocus, setBlueFocus] = useState<boolean>(false);

  const previousBlueMathData = useRef<string | null>(null);
  const previousRedMathData = useRef<string | null>(null);
  const previousGreenMathData = useRef<string | null>(null);

  // useEffect(() => {
  //   return () => {
  //     previousBlueMathData.current = blueMathData;
  //     previousRedMathData.current = redMathData;
  //     previousGreenMathData.current = greenMathData;
  //   };
  // }, []);

  useEffect(() => {
    computeEngine.current = new ComputeEngine();
    if (blueFieldRef.current && blueFieldRef.current.childNodes.length === 0) {
      const mathfield = new MathfieldElement();
      mathfield.autofocus = false;

      blueFieldRef.current.appendChild(mathfield);
    }
    if (redFieldRef.current && redFieldRef.current.childNodes.length === 0) {
      const mathfield = new MathfieldElement();
      mathfield.autofocus = false;
      redFieldRef.current.appendChild(mathfield);
    }

    if (
      greenFieldRef.current &&
      greenFieldRef.current.childNodes.length === 0
    ) {
      const mathfield = new MathfieldElement();
      mathfield.autofocus = false;
      greenFieldRef.current.appendChild(mathfield);
    }
  }, []);

  const handleBlueInput = useCallback(
    (event: React.FormEvent<MathfieldElement>) => {
      if (computeEngine.current) {
        // event.currentTarget.value = event.currentTarget.value.replace(
        //   /x/g,
        //   "b"
        // );
        const someValue = computeEngine.current.parse(
          event.currentTarget.value,
          { canonical: false }
        ).latex;
        setBlueMathData(someValue);
      }
    },
    [setBlueMathData]
  );

  const handleRedInput = useCallback(
    (event: React.FormEvent<MathfieldElement>) => {
      if (computeEngine.current) {
        // Replace any x's with r's

        // event.currentTarget.value = event.currentTarget.value.replace(
        //   /x/g,
        //   "r"
        // );

        const someValue = computeEngine.current.parse(
          event.currentTarget.value,
          { canonical: false }
        ).latex;
        setRedMathData(someValue);
      }
    },
    [setRedMathData]
  );

  const handleGreenInput = useCallback(
    (event: React.FormEvent<MathfieldElement>) => {
      if (computeEngine.current) {
        // event.currentTarget.value = event.currentTarget.value.replace(
        //   /x/g,
        //   "g"
        // );
        const someValue = computeEngine.current.parse(
          event.currentTarget.value,
          { canonical: false }
        ).latex;
        someValue;
        setGreenMathData(someValue);
      }
    },
    [setGreenMathData]
  );

  return (
    <div className="w-full text-blue-400 flex flex-col justify-center items-center space-y-4 mb-2">
      <div className="w-full">
        <Label className="dark:text-red-300 text-red-500 text-xs">
          Red Channel
        </Label>
        <math-field
          onBlur={() => setRedFocus(false)}
          onFocus={() => setRedFocus(true)}
          autoFocus={false}
          onInput={(event) => handleRedInput(event)}
          ref={redFieldRef}
          style={{
            width: "100%",
            color: "red",
            border: "1px solid red",
            fontSize: "1.5rem",
          }}
        >
          {!redFocus && redMathData}
        </math-field>
      </div>
      <div className="w-full">
        <Label className="dark:text-green-300 text-green-500 text-xs">
          Green Channel
        </Label>
        <math-field
          onFocus={() => setGreenFocus(true)}
          onBlur={() => setGreenFocus(false)}
          autoFocus={false}
          onInput={(event) => handleGreenInput(event)}
          ref={greenFieldRef}
          style={{
            width: "100%",
            color: "green",
            border: "1px solid green",
            fontSize: "1.5rem",
          }}
        >
          {!greenFocus && greenMathData}
        </math-field>
      </div>
      <div className="w-full">
        <Label className="dark:text-blue-300 text-blue-500 text-xs">
          Blue Channel
        </Label>

        <math-field
          onBlur={() => setBlueFocus(false)}
          onFocus={() => setBlueFocus(true)}
          autoFocus={false}
          onInput={(event) => handleBlueInput(event)}
          ref={blueFieldRef}
          style={{
            width: "100%",
            color: "blue",
            border: "1px solid blue",
            fontSize: "1.5rem",
          }}
        >
          {!blueFocus && blueMathData}
        </math-field>
      </div>
    </div>
  );
};

export default LiveMath;
