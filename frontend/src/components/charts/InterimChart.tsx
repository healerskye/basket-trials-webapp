"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface InterimData {
  name: string;
  futility: number;
  efficacy: number;
}

interface Props {
  data: InterimData[];
}

export default function InterimChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} />
        <Tooltip formatter={(v: number) => v.toFixed(4)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="futility" name="Futility Stop" fill="#E15759" />
        <Bar dataKey="efficacy" name="Efficacy Stop" fill="#59A14F" />
      </BarChart>
    </ResponsiveContainer>
  );
}
