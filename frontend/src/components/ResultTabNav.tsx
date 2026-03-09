"use client";

export type ResultTabId =
  | "scenarios"
  | "results"
  | "global"
  | "perbasket"
  | "interim";

const resultTabs: { id: ResultTabId; label: string }[] = [
  { id: "scenarios", label: "Scenarios & Rules" },
  { id: "results", label: "Results Table" },
  { id: "global", label: "Global Metrics" },
  { id: "perbasket", label: "Per-Basket" },
  { id: "interim", label: "Interim Analysis" },
];

interface Props {
  active: ResultTabId;
  onSelect: (id: ResultTabId) => void;
}

export default function ResultTabNav({ active, onSelect }: Props) {
  return (
    <div className="flex border-b border-gray-200 bg-white px-2 overflow-x-auto">
      {resultTabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            active === t.id
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
