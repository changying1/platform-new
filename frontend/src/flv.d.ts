// Type definitions for flv.js
// https://github.com/bilibili/flv.js

declare module 'flv.js' {
  export interface Config {
    type: string;
    url?: string;
    isLive?: boolean;
    hasAudio?: boolean;
    hasVideo?: boolean;
    deferredLoadThreshold?: number;
    bufferingDuration?: number;
    bufferingTimeout?: number;
    stashInitialSize?: number;
    fflags?: string;
    headers?: Record<string, string>;
    [key: string]: any;
  }

  export interface FlvPlayer {
    load(): void;
    unload(): void;
    play(): Promise<void>;
    pause(): void;
    stop(): void;
    destroy(): void;
    attachMediaElement(element: HTMLVideoElement): void;
    detachMediaElement(): void;
    on(event: string, callback: Function): void;
    off(event: string, callback?: Function): void;
    seekTo(seconds: number): void;
    getDuration(): number;
    [key: string]: any;
  }

  export interface FlvJsStatic {
    isSupported(): boolean;
    createPlayer(config: Config): FlvPlayer;
    Events: {
      ERROR: string;
      LOADING_COMPLETE: string;
      MEDIA_INFO: string;
      METADATA_ARRIVED: string;
      SCRIPTDATA_ARRIVED: string;
      STATISTICS_INFO: string;
      BUFFER_CONCAT: string;
      [key: string]: string;
    };
    ErrorTypes: {
      NETWORK_ERROR: string;
      MEDIA_ERROR: string;
      OTHER_ERROR: string;
      [key: string]: string;
    };
    ErrorDetails: {
      [key: string]: string;
    };
  }

  const flvjs: FlvJsStatic;
  export default flvjs;
}
