export const isDesktopRuntime = () =>
  typeof window !== "undefined" && window.zynaloDesktop?.environment === "desktop";

export const getDesktopApi = () => window.zynaloDesktop ?? null;
