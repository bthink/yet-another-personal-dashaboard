"use client"

import { useState } from "react"
import ResearchLauncher from "@/components/research/ResearchLauncher"
import ResearchStatus from "@/components/research/ResearchStatus"

export default function ResearchPage() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)

  return (
    <main className="flex-1 overflow-auto p-8">
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
          Research
        </h1>
        <p style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "24px" }}>
          Vault + Web → notatka w 03_Knowledge/
        </p>

        <ResearchLauncher onJobStarted={setCurrentJobId} />
        <ResearchStatus jobId={currentJobId} />
      </div>
    </main>
  )
}
