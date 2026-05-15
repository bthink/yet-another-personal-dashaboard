import { NextRequest, NextResponse } from "next/server"
import { createJob, updateJob } from "@/lib/research-jobs"
import { runResearchPipeline } from "@/lib/research-pipeline"

type StartBody = {
  query: string
  urls: string[]
  targetFolder: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: StartBody
  try {
    body = (await req.json()) as StartBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { query, urls, targetFolder } = body

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "query required" }, { status: 400 })
  }
  if (!Array.isArray(urls)) {
    return NextResponse.json({ error: "urls must be array" }, { status: 400 })
  }
  if (!targetFolder || typeof targetFolder !== "string") {
    return NextResponse.json({ error: "targetFolder required" }, { status: 400 })
  }

  const job = createJob(query.trim(), urls, targetFolder)

  void runResearchPipeline(job).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "Pipeline failed"
    updateJob(job.id, { status: "error", error: message })
  })

  return NextResponse.json({ jobId: job.id })
}
