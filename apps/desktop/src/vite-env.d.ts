/// <reference types="vite/client" />

// pixi.js/unsafe-eval is a CSP-safe re-export of the same pixi.js API
declare module 'pixi.js/unsafe-eval' {
  export * from 'pixi.js';
}
