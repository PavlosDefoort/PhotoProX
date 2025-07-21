import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface LuminanceHistogramProps {
  binEdges: number[];
  frequencies: number[];
}

const LuminanceHistogram: React.FC<LuminanceHistogramProps> = ({
  binEdges,
  frequencies,
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!chartRef.current || !binEdges || !frequencies) return;

    const ctx = chartRef.current.getContext("2d");

    if (!ctx) return;

    // Destroy the previous chart instance
    const previousChart = Chart.getChart(chartRef.current);
    if (previousChart) {
      previousChart.destroy();
    }

    // Determine the maximum frequency
    const maxFrequency = Math.max(...frequencies);

    // Create the chart
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: binEdges.map((edge) => edge.toFixed(2)), // Round bin edges to 2 decimal places for display
        datasets: [
          {
            label: "Luminance Histogram",
            data: frequencies,
            backgroundColor: "gray",
          },
        ],
      },
      options: {
        plugins: {
          tooltip: {
            enabled: false,
          },

          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            title: {
              display: false,
              text: "Luminance Value (0-255)",
            },
            ticks: {
              display: false,
            },
          },
          y: {
            title: {
              display: false,
              text: "Frequency",
            },
            ticks: {
              display: false,
              maxTicksLimit: maxFrequency + 1000, // Set the maximum value of the y-axis slightly higher than the maximum frequency
            },
          },
        },
      },
    });
  }, [binEdges, frequencies]);

  return (
    <div className="h-full w-full">
      <canvas ref={chartRef} className="h-full" />
    </div>
  );
};

export default LuminanceHistogram;
