/// <reference types="vite/client" />

import type { CamafApi } from '../electron/preload';

declare global {
  interface Window {
    camaf: CamafApi;
  }
}
