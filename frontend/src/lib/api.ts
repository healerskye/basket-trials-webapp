import { BatchApiResponse } from "@/types/batch";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://basket-trials-api.fly.dev";

// R's jsonlite serializes scalars as [value] — unwrap them recursively
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unbox(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    // Single-element arrays of primitives → unwrap to scalar
    // Multi-element arrays → keep as arrays but unbox each element
    if (obj.length === 1 && (typeof obj[0] !== "object" || obj[0] === null)) {
      return obj[0];
    }
    return obj.map(unbox);
  }
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = unbox(v);
    }
    return out;
  }
  return obj;
}

async function post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return unbox(data) as T;
}

export interface SimulationParams {
  seed: number;
  simN: number;
  narm: number;
  p0: number[];
  p1: number[];
  alpha: number[];
  samplesize: number[];
  speed: number[];
  respRate: number[];
  futstop: number;
  futthr: number;
  effstop: number;
  effthr: number;
  nullScenario: boolean;
}

export interface SimulationResult {
  armIndex: number[];
  referenceRate: number[];
  targetRate: number[];
  typeIError: number[];
  trueRate: number[];
  finalThreshold: number[];
  powerPerArm: number[];
  fwer: number;
  fwPower1: number;
  fwPower2: number;
  bias: number[];
  biasSD: number[];
  avgPatients: number[];
  sdPatients: number[];
  interimCum1: number[];
  probFutility1: number[];
  probEfficacy1: number[];
  interimCum2: number[];
  probFutility2: number[];
  probEfficacy2: number[];
}

export interface ApiResponse {
  success: boolean;
  result?: SimulationResult;
  error?: string;
  rCode?: string;
}

// BBHM specific params
export interface BbhmParams extends SimulationParams {
  mu0: number;
  sigma0: number;
  lambda1: number;
  lambda2: number;
}

// CBHM specific params
export interface CbhmParams extends SimulationParams {
  mu0: number;
  sigma0: number;
  varMin: number;
  varMax: number;
}

// EXNEX specific params
export interface ExnexParams extends SimulationParams {
  mu0_1: number;
  sigma0_1: number;
  mu0_2: number;
  sigma0_2: number;
  scale1: number;
  scale2: number;
  nexM: number;
  nexV: number;
}

// MUCE specific params
export interface MuceParams extends SimulationParams {
  scale1: number;
  scale3: number;
  sigmaZ: number;
  sigmaXi: number;
  sigmaEta: number;
  mu1: number;
  sigma1: number;
  mu2: number;
  sigma2: number;
}

export function runBbhm(params: BbhmParams) {
  return post<ApiResponse>("/bbhm", params as unknown as Record<string, unknown>);
}

export function runCbhm(params: CbhmParams) {
  return post<ApiResponse>("/cbhm", params as unknown as Record<string, unknown>);
}

export function runExnex(params: ExnexParams) {
  return post<ApiResponse>("/exnex", params as unknown as Record<string, unknown>);
}

export function runMuce(params: MuceParams) {
  return post<ApiResponse>("/muce", params as unknown as Record<string, unknown>);
}

export function runBatch(design: string, params: Record<string, unknown>) {
  return post<BatchApiResponse>(`/batch/${design}`, params);
}
