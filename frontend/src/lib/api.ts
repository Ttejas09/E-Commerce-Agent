// API client — all calls to the backend go through here
import type {
  StartRequest,
  StartResponse,
  ObserveRequest,
  ObserveResponse,
  FinishRequest,
  FinishResponse,
  ProductSummary,
  ErrorResponse,
} from "../types/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

class ApiError extends Error {
  status: number;
  error_code: string;
  detail: string;

  constructor(
    status: number,
    error_code: string,
    detail: string,
  ) {
    super(`[${status}] ${error_code}: ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.error_code = error_code;
    this.detail = detail;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);

  if (!res.ok) {
    let err: ErrorResponse;
    try {
      err = await res.json();
    } catch {
      throw new ApiError(res.status, "UNKNOWN", res.statusText);
    }
    throw new ApiError(res.status, err.error_code, err.detail);
  }

  return res.json();
}

// ─── Endpoints ──────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string }> {
  return request("GET", "/health");
}

export async function agentStart(
  body: StartRequest,
): Promise<StartResponse> {
  return request("POST", "/agent/start", body);
}

export async function agentObserve(
  body: ObserveRequest,
): Promise<ObserveResponse> {
  return request("POST", "/agent/observe", body);
}

export async function agentFinish(
  body: FinishRequest,
): Promise<FinishResponse> {
  return request("POST", "/agent/finish", body);
}

export async function getProduct(
  product_id: string,
): Promise<ProductSummary> {
  return request("GET", `/products/${encodeURIComponent(product_id)}`);
}

export { ApiError };
