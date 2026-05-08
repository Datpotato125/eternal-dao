export {};

declare global {
  interface Window {
    electronAPI: {
      openExternal: (url: string) => Promise<void>;
      onDeepLink: (callback: (url: string) => void) => () => void;
    };
  }
}
