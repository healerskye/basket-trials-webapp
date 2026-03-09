"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface ChartData {
  name: string;
  Power: number;
  "True Rate": number;
  "Ref Rate": number;
}

export default function PowerChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Power" fill="#3b82f6" />
        <Bar dataKey="True Rate" fill="#10b981" />
        <Bar dataKey="Ref Rate" fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  );
}
