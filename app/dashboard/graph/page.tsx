"use client";

import dynamic from "next/dynamic";

const GraphView = dynamic(() => import("@/components/graph/GraphView"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center bg-[#03050f] text-sm text-slate-400">
      Loading graph...
    </div>
  ),
});

export default function GraphPage() {
  return (
    <main className="flex flex-1 overflow-hidden">
      <GraphView />
    </main>
  );
}
