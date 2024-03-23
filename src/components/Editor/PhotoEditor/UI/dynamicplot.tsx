import React, { useEffect, useRef, useState } from "react";
import { Mafs, Coordinates, Plot, Theme } from "mafs";
import Script from "next/script";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { BoxedExpression, ComputeEngine } from "@cortex-js/compute-engine";
import { AdjustmentLayer } from "@/utils/editorInterfaces";
import { Functions } from "@/utils/filters";
import { red } from "@mui/material/colors";
import { set } from "lodash";
import { useProjectContext } from "@/pages/editor";
import { late } from "zod";
import { Application, Program, Shader } from "pixi.js";
import { toast } from "sonner";
import { ErrorOutline } from "@mui/icons-material";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

const DynamicLiveMath = dynamic(() => import("./LiveMath"), { ssr: false });

const math = require("mathjs");

interface DynamicPlotProps {
  layer: AdjustmentLayer;
}

const DynamicPlot: React.FC<DynamicPlotProps> = ({ layer }) => {
  const [func, setFunc] = useState<string>("x");
  const [blueMathData, setBlueMathData] = useState("b");
  const [redMathData, setRedMathData] = useState("r");
  const [greenMathData, setGreenMathData] = useState("g");
  const [value, setValue] = useState(0);
  const computeEngine = useRef<ComputeEngine | null>(null);
  const [blueExpr, setBlueExpr] = useState<BoxedExpression>();
  const [redExpr, setRedExpr] = useState<BoxedExpression>();
  const [greenExpr, setGreenExpr] = useState<BoxedExpression>();
  const { project, setProject } = useProjectContext();
  const previousBlueMathData = useRef<string | null>(null);
  const previousRedMathData = useRef<string | null>(null);
  const previousGreenMathData = useRef<string | null>(null);
  const [showFullFunction, setShowFullFunction] = useState(true);

  useEffect(() => {
    const blueData = layer.mathData?.blueMathData;
    const redData = layer.mathData?.redMathData;
    const greenData = layer.mathData?.greenMathData;
    computeEngine.current = new ComputeEngine();

    if (blueData && redData && greenData && computeEngine.current) {
      const newBlueExpr = computeEngine.current.parse(blueData, {
        canonical: true,
      });
      const newRedExpr = computeEngine.current.parse(redData, {
        canonical: true,
      });
      const newGreenExpr = computeEngine.current.parse(greenData, {
        canonical: true,
      });

      setBlueMathData(blueData);
      setRedMathData(redData);
      setGreenMathData(greenData);

      setBlueExpr(newBlueExpr);
      setRedExpr(newRedExpr);
      setGreenExpr(newGreenExpr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    layer.mathData?.blueMathData,
    layer.mathData?.greenMathData,
    layer.mathData?.redMathData,
  ]);

  const blueFunction = (x: number) => {
    if (!computeEngine.current || !blueExpr) return 0;
    computeEngine.current.assign("b", x);
    if (showFullFunction) {
      return Number(blueExpr.value);
    } else {
      if (!computeEngine.current || !blueExpr || !(0 <= x && x <= 1)) return 0;

      if (0 > Number(blueExpr.value)) {
        return 0;
      } else if (Number(blueExpr.value) > 1) {
        return 1;
      } else {
        return Number(blueExpr.value);
      }
    }
  };

  const redFunction = (x: number) => {
    if (!computeEngine.current || !redExpr) return 0;
    computeEngine.current.assign("r", x);
    if (showFullFunction) {
      return Number(redExpr.value);
    } else {
      if (!computeEngine.current || !redExpr || !(0 <= x && x <= 1)) return 0;

      if (0 > Number(redExpr.value)) {
        return 0;
      } else if (Number(redExpr.value) > 1) {
        return 1;
      } else {
        return Number(redExpr.value);
      }
    }
  };

  const greenFunction = (x: number) => {
    if (!computeEngine.current || !greenExpr) return 0;
    computeEngine.current.assign("g", x);
    if (showFullFunction) {
      return Number(greenExpr.value);
    } else {
      if (!computeEngine.current || !greenExpr || !(0 <= x && x <= 1)) return 0;

      if (0 > Number(greenExpr.value)) {
        return 0;
      } else if (Number(greenExpr.value) > 1) {
        return 1;
      } else {
        return Number(greenExpr.value);
      }
    }
  };

  function convertLatexToGLSL(latexExpression: string): string {
    // Replace LaTeX exponentiation pattern with GLSL pow function

    function convertNumbersToFloats(inputString: string): string {
      return inputString.replace(/-?\d+(\.\d+)?/g, (match: string) => {
        // Check if the number is already a float
        if (match.includes(".")) return match;
        return match + ".0"; // Convert the matched substring to a float
      });
    }

    const glslExpression = latexExpression.replace(
      /(\w+)\^\{([^{}]+)\}/g,
      (_, base, exponent) => {
        if (!isNaN(parseFloat(exponent))) {
          // If the exponent is a number, use it directly
          return `pow(${base}, ${exponent})`;
        } else {
          // If the exponent is an expression, keep it as is
          return `pow(${base}, ${exponent})`;
        }
      }
    );

    // Convert any fractions to GLSL division (e.g. \frac{2}{3} -> ((2.0) / (3.0))
    // glslExpression.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "(($1)/($2.0))");

    // Replace other LaTeX functions with GLSL equivalents

    function convertLatexLogToGLSL(logExpression: string): string {
      // Match the LaTeX-style logarithm expression with base and argument
      const matches = logExpression.match(/log_{([^}]+)}\(([^)]+)\)/);
      if (!matches || matches.length !== 3) {
        // Invalid expression format
        return logExpression;
      }

      // Extract base and argument from the matches
      const base = matches[1];
      const argument = matches[2];

      // Replace the LaTeX-style representation with the GLSL-style representation
      return `log(${argument}) / log(${base})`;
    }

    const logga = convertLatexLogToGLSL(glslExpression);
    console.log(logga, "logga");
    const glslExpressionFinal = logga
      .replace(/\\sin\(([^)]+)\)/g, "sin($1)")
      .replace(/\\cos\(([^)]+)\)/g, "cos($1)")
      .replace(/\\tan\(([^)]+)\)/g, "tan($1)")
      .replace(/\\sec\(([^)]+)\)/g, "sec($1)")
      .replace(/\\csc\(([^)]+)\)/g, "csc($1)")
      .replace(/\\cot\(([^)]+)\)/g, "cot($1)")
      .replace(/\\ln\(([^)]+)\)/g, "log($1)")
      .replace(/\\log\(([^)]+)\)/g, "log($1)")
      .replace(/\\sqrt{([^}]+)}/g, "sqrt($1)")
      // Match then replace multiiplication and convert to ${1}*${2}
      .replace(/(\d+)([a-zA-Z])/g, "$1*$2")
      // Replace any fraction (e.g. \frac{2}{3} -> 2/3)
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");

    // To finalize, we should converts any numbers to floats
    const converted = convertNumbersToFloats(glslExpressionFinal);
    console.log(converted, "converted");

    return converted;
  }

  const handleSubmit = () => {
    if (computeEngine.current && layer) {
      const newBlueExpr = computeEngine.current.parse(blueMathData, {
        canonical: true,
      });
      const newRedExpr = computeEngine.current.parse(redMathData, {
        canonical: true,
      });
      const newGreenExpr = computeEngine.current.parse(greenMathData, {
        canonical: true,
      });

      if (layer) {
        try {
          const resultR = convertLatexToGLSL(redMathData);
          const resultG = convertLatexToGLSL(greenMathData);
          const resultB = convertLatexToGLSL(blueMathData);

          const valid = validateGLSLCode(
            generateTestGLSLCode(resultR, resultG, resultB)
          );

          if (valid) {
            const matrix = new Functions(resultR, resultG, resultB);
            layer.container.filters = [matrix];
            setProject((draft) => {
              const foundLayer = draft.layerManager.findLayer(layer.id);
              if (foundLayer && foundLayer.type === "adjustment") {
                const adjustmentLayer = foundLayer as AdjustmentLayer;
                if (adjustmentLayer.mathData) {
                  draft.layerManager.layers = draft.layerManager.layers.map(
                    (l) => {
                      if (l.id === foundLayer.id) {
                        // Create a new object with the updated 'visible' property
                        l as AdjustmentLayer;

                        return {
                          ...l,
                          mathData: {
                            blueMathData: blueMathData,
                            redMathData: redMathData,
                            greenMathData: greenMathData,
                          },
                        } as AdjustmentLayer;
                      }
                      return l;
                    }
                  );
                }
              }
            });
            setBlueExpr(newBlueExpr);
            setRedExpr(newRedExpr);
            setGreenExpr(newGreenExpr);
          } else {
            toast("Function could not be compiled.", {
              description: "Please check your function and try again.",
              duration: 4000,
              important: true,
              icon: <ExclamationTriangleIcon />,
              action: {
                label: "Dismiss",
                onClick: () => {
                  // Undo the copy of the address
                  toast.dismiss();
                },
              },
            });
          }
        } catch (error) {
          console.log(error);
        }
      }
    }
  };

  function generateTestGLSLCode(
    redCode: string,
    greenCode: string,
    blueCode: string
  ): string {
    return `
    precision mediump float;

    // Return value of any base logarithm
    float log_b(float base, float x){
     return log(x) / log(base);
    } 

    float sec(float x) {
    return 1.0 / cos(x);
    }

    float csc(float x) {
    return 1.0 / sin(x);
    }

    float cot(float x) {
    return 1.0 / tan(x);
    }

    float testRed(float r, float g, float b) {
      return ${redCode};
    }

    float testGreen(float r, float g, float b) {
      return ${greenCode};
    }

    float testBlue(float r, float g, float b) {
      return ${blueCode};
    }

    void main() {

      testRed(0.5, 0.5, 0.5);
      testGreen(0.5, 0.5, 0.5);
      testBlue(0.5, 0.5, 0.5);


    }

    `;
  }

  function validateGLSLCode(fragmentShaderSource: string): boolean {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return false;

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    console.log(gl, "gl", fragmentShader, "fragmentShader");
    if (!fragmentShader) return false;

    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error(
        "Fragment shader failed to compile: " +
          gl.getShaderInfoLog(fragmentShader)
      );
      return false;
    }

    return true;
  }

  return (
    <div className="animate-fade animate-once flex flex-col justify-center items-center space-y-5">
      {layer.mathData && (
        <DynamicLiveMath
          blueMathData={blueMathData}
          redMathData={redMathData}
          greenMathData={greenMathData}
          setBlueMathData={setBlueMathData}
          setRedMathData={setRedMathData}
          setGreenMathData={setGreenMathData}
          id={layer?.id}
        />
      )}
      <Button
        onClick={handleSubmit}
        className="bg-blue-700 hover:bg-blue-800 w-full dark:bg-white dark:hover:bg-slate-100"
      >
        Compute
      </Button>

      <div className="w-full border-t-2 mt-2 mb-2 border border-[#cdcdcd] dark:border-[#252525]"></div>

      <Mafs
        viewBox={{ x: [0, 1], y: [0, 1] }}
        pan={true}
        preserveAspectRatio={false}
        height={300}
        zoom={true}
      >
        <Coordinates.Cartesian />
        <Plot.OfX
          y={(x: number) => redFunction(x)}
          color={Theme.red}
          minSamplingDepth={3}
          maxSamplingDepth={7}
        />{" "}
        <Plot.OfX
          y={(x: number) => greenFunction(x)}
          color={Theme.green}
          minSamplingDepth={3}
          maxSamplingDepth={7}
        />
        <Plot.OfX
          y={(x: number) => blueFunction(x)}
          color={Theme.blue}
          minSamplingDepth={3}
          maxSamplingDepth={7}
        />
      </Mafs>
    </div>
  );
};

export default DynamicPlot;
