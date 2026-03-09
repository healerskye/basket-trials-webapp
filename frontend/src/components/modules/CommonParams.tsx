"use client";
import { useState, useEffect } from "react";
import InputField from "../ui/InputField";
import ArrayInput from "../ui/ArrayInput";

export interface CommonState {
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

export function defaultCommon(narm = 4): CommonState {
  // Default: mixed scenario — first arm at p1, rest at p0
  const respRate = Array(narm).fill(0.15);
  if (narm >= 2) respRate[0] = 0.35;
  if (narm >= 4) respRate[1] = 0.35;
  return {
    seed: 12345,
    simN: 100,
    narm,
    p0: Array(narm).fill(0.15),
    p1: Array(narm).fill(0.35),
    alpha: Array(narm).fill(0.1),
    samplesize: Array(narm).fill(27),
    speed: Array(narm).fill(1),
    respRate,
    futstop: 1,
    futthr: 0.1,
    effstop: 0,
    effthr: 1.0,
    nullScenario: false,
  };
}

interface Props {
  state: CommonState;
  onChange: (s: CommonState) => void;
}

export default function CommonParams({ state, onChange }: Props) {
  const s = state;
  const set = <K extends keyof CommonState>(key: K, val: CommonState[K]) =>
    onChange({ ...s, [key]: val });

  // Resize arrays when narm changes
  useEffect(() => {
    const n = s.narm;
    const resize = (arr: number[], def: number) =>
      arr.length === n ? arr : Array(n).fill(def).map((d, i) => arr[i] ?? d);
    const newState = {
      ...s,
      p0: resize(s.p0, 0.15),
      p1: resize(s.p1, 0.35),
      alpha: resize(s.alpha, 0.1),
      samplesize: resize(s.samplesize, 27),
      speed: resize(s.speed, 1),
      respRate: resize(s.respRate, 0.15),
    };
    if (JSON.stringify(newState) !== JSON.stringify(s)) onChange(newState);
  }, [s.narm]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-blue-800 mb-2 uppercase tracking-wide">
          Simulation Settings
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <InputField label="Seed" value={s.seed} onChange={(v) => set("seed", v)} min={1} step={1} />
          <InputField label="Simulations" value={s.simN} onChange={(v) => set("simN", v)} min={10} max={10000} step={10} help="Number of Monte Carlo simulations" />
          <InputField label="Arms" value={s.narm} onChange={(v) => set("narm", v)} min={2} max={10} step={1} help="Number of basket arms" />
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
          Per-Arm Parameters
        </h3>
        <ArrayInput label="Reference Rate (p0)" values={s.p0} onChange={(v) => set("p0", v)} min={0} max={1} step={0.01} help="Null response rate per arm" />
        <ArrayInput label="Target Rate (p1)" values={s.p1} onChange={(v) => set("p1", v)} min={0} max={1} step={0.01} help="Alternative response rate per arm" />
        <ArrayInput label="Alpha" values={s.alpha} onChange={(v) => set("alpha", v)} min={0.01} max={0.5} step={0.01} help="Type I error rate per arm" />
        <ArrayInput label="Sample Size" values={s.samplesize} onChange={(v) => set("samplesize", v)} min={5} max={500} step={1} />
        <ArrayInput label="Enrollment Speed" values={s.speed} onChange={(v) => set("speed", v)} min={0.1} max={10} step={0.1} />
        <ArrayInput label="True Response Rate" values={s.respRate} onChange={(v) => set("respRate", v)} min={0} max={1} step={0.01} help="Actual response rate for simulation" />
      </div>

      <div className="bg-amber-50 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">
          Interim Analysis
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="flex items-center gap-2 text-xs text-gray-700 mb-1">
              <input
                type="checkbox"
                checked={s.futstop === 1}
                onChange={(e) => set("futstop", e.target.checked ? 1 : 0)}
                className="rounded"
              />
              Futility Stopping
            </label>
            {s.futstop === 1 && (
              <InputField label="Futility Threshold" value={s.futthr} onChange={(v) => set("futthr", v)} min={0} max={1} step={0.01} />
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs text-gray-700 mb-1">
              <input
                type="checkbox"
                checked={s.effstop === 1}
                onChange={(e) => set("effstop", e.target.checked ? 1 : 0)}
                className="rounded"
              />
              Efficacy Stopping
            </label>
            {s.effstop === 1 && (
              <InputField label="Efficacy Threshold" value={s.effthr} onChange={(v) => set("effthr", v)} min={0} max={1} step={0.01} />
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-700 mt-2">
          <input
            type="checkbox"
            checked={s.nullScenario}
            onChange={(e) => set("nullScenario", e.target.checked)}
            className="rounded"
          />
          Null Scenario (calibrate thresholds)
        </label>
      </div>
    </div>
  );
}
