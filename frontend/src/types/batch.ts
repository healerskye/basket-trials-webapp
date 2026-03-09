export interface Scenario {
  name: string;
  respRates: number[];
}

export interface ThresholdConfig {
  name: string;
  values: number[];
}

export interface BatchResultRow {
  scenario: string;
  threshold: string;
  fwer: number | null;
  disjPower: number | null;
  conjPower: number | null;
  rejectRates: number[];
  type1Errors: number[];
  powers: number[];
  nullBaskets: number[];
  altBaskets: number[];
  futilityRates: number[];
  efficacyRates: number[];
  pTrue: number[];
  avgPatients: number[];
  sdPatients: number[];
}

export interface BatchApiResponse {
  success: boolean;
  results?: BatchResultRow[];
  error?: string;
}
