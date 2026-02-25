import "@testing-library/jest-dom/vitest";

// Uppy Dashboard uses ResizeObserver which is not available in jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
