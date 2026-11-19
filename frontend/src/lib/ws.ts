// WebSocket Client for /agent/stream framing
// Handles reconnection, sequential frame sending, and response dispatching

import type {
  StartRequest,
  StartResponse,
  ObserveRequest,
  ObserveResponse,
  FinishRequest,
  FinishResponse,
  WSFrameIn,
  WSFrameOut,
} from "../types/api";

const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ||
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000")
    .replace(/^http:/, "ws:")
    .replace(/^https:/, "wss:");

export class AgentWebSocketClient {
  private ws: WebSocket | null = null;
  private pendingResolvers = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
    }
  >();
  private messageQueue: WSFrameOut[] = [];

  private url: string;

  constructor(url: string = `${WS_BASE_URL}/agent/stream`) {
    this.url = url;
  }

  connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const frame: WSFrameOut = JSON.parse(event.data);
            this.handleFrame(frame);
          } catch (e) {
            console.error("Failed to parse WS frame:", event.data, e);
          }
        };

        this.ws.onerror = (err) => {
          reject(err);
        };

        this.ws.onclose = () => {
          this.ws = null;
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleFrame(frame: WSFrameOut) {
    // Dispatch to registered resolver by frame type
    const key = frame.type;
    const resolver = this.pendingResolvers.get(key);
    if (resolver) {
      this.pendingResolvers.delete(key);
      if (frame.type === "error") {
        resolver.reject(new Error(frame.payload.detail));
      } else {
        resolver.resolve(frame.payload);
      }
    } else {
      this.messageQueue.push(frame);
    }
  }

  private sendFrame<T>(frame: WSFrameIn, expectedResponse: string): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("WebSocket not connected"));
    }

    return new Promise((resolve, reject) => {
      // Check if response already in queue
      const existingIdx = this.messageQueue.findIndex(
        (m) => m.type === expectedResponse,
      );
      if (existingIdx !== -1) {
        const item = this.messageQueue.splice(existingIdx, 1)[0];
        resolve(item.payload as T);
        return;
      }

      this.pendingResolvers.set(expectedResponse, { resolve, reject });
      this.ws!.send(JSON.stringify(frame));
    });
  }

  async start(body: StartRequest): Promise<StartResponse> {
    await this.connect();
    return this.sendFrame<StartResponse>(
      { type: "start", payload: body },
      "start_ack",
    );
  }

  async observe(body: ObserveRequest): Promise<ObserveResponse> {
    return this.sendFrame<ObserveResponse>(
      { type: "observe", payload: body },
      "observe",
    );
  }

  async finish(body: FinishRequest): Promise<FinishResponse> {
    const res = await this.sendFrame<FinishResponse>(
      { type: "finish", payload: body },
      "finish",
    );
    this.close();
    return res;
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingResolvers.clear();
    this.messageQueue = [];
  }
}
