export type AdjustmentValues = {
  brightness: number;
  contrast: number;
  saturation: number;
};

type SampleData = {
  bins: number[];
  frequencies: number[];
};

export type AnalysisData = {
  luminance: Uint8Array;
  red: Uint8Array;
  green: Uint8Array;
  blue: Uint8Array;
  alpha: Uint8Array;
};

export type HistogramArray = {
  red: SampleData;
  green: SampleData;
  blue: SampleData;
  luminance: SampleData;
  alpha: SampleData;
};
