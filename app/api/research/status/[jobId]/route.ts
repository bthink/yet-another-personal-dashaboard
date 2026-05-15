import { NextRequest, NextResponse } from "next/server"
import { getJob } from "@/lib/research-jobs"

const PHASE_LABELS: Record<string, string> = {
  "vault-search": "szuka w vaultcie...",
  "url-fetch": "pobiera URLe...",
  "web-search": "przeszukuje web...",
  synthesizing: "generuje notatkę...",
  writing: "zapisuje do vaultu...",
  done: "gotowe",
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params
  const job = getJob(jobId)

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json({
    status: job.status,
    phaseLabel: PHASE_LABELS[job.phase] ?? job.phase,
    notePath: job.notePath,
    noteTitle: job.noteTitle,
    error: job.error,
  })
}
