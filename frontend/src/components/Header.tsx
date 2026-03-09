"use client";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Basket Trials Simulator
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Bayesian adaptive basket trial designs: BBHM, CBHM, EXNEX, MUCE
          </p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
          MCMC Simulation
        </span>
      </div>
    </header>
  );
}
