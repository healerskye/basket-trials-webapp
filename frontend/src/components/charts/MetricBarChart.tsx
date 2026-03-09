"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface MetricBarChartProps {
  data: { name: string; value: number }[];
  color: string;
  title: string;
  referenceLine?: number;
}

export default function MetricBarChart({ data, color, title, referenceLine }: MetricBarChartProps) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-700 mb-1">{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10 }} domain={[0, 1]} />
          <Tooltip formatter={(v: number) => v.toFixed(4)} />
          <Bar dataKey="value" fill={color} />
          {referenceLine !== undefined && (
            <ReferenceLine y={referenceLine} stroke="#666" strokeDasharray="5 5" label={{ value: referenceLine.toString(), position: "right", fontSize: 10 }} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
