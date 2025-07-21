// Utility functions for input handling
// Includes: Photo input, number input, and text input

export const updateNestedState = <T>(obj: T, path: string, value: any): T => {
  const keys = path.split(".");
  const lastKey = keys.pop();
  const deepClone = { ...obj };

  let current: any = deepClone;
  keys.forEach((key) => {
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  });

  if (lastKey) {
    current[lastKey] = value;
  }

  return deepClone as T;
};

export const getObjectValue = (obj: any, path: string): any => {
  const keys = path.split(".");
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === "object") {
      value = value[key];
    } else {
      return undefined; // Return undefined if any key along the path is not found or if the value is not an object
    }
  }

  return value;
};
