"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface PerBasketData {
  name: string;
  type1Error: number | null;
  power: number | null;
}

interface Props {
  data: PerBasketData[];
}

export default function PerBasketChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} />
        <Tooltip formatter={(v) => v !== null && v !== undefined ? Number(v).toFixed(4) : "N/A"} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="type1Error" name="Type I Error" fill="#E15759" />
        <Bar dataKey="power" name="Power" fill="#59A14F" />
      </BarChart>
    </ResponsiveContainer>
  );
}
