import { Container } from "pixi.js";

let createAdjustmentContainer: (adjustmentType: string) => Container;

if (typeof window !== "undefined") {
  import("pixi-filters").then(
    ({ AdjustmentFilter, AdvancedBloomFilter, DropShadowFilter }) => {
      createAdjustmentContainer = (adjustmentType: string) => {
        // Define your function here
        const container = new Container();
        // Add adjustment effects, filters, etc.
        return container;
      };
    }
  );
}

// Export the function or code you want to use outside of the import block
export { createAdjustmentContainer };
