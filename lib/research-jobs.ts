import crypto from "node:crypto"

export type JobStatus = "running" | "done" | "error"

export type JobPhase =
  | "vault-search"
  | "url-fetch"
  | "web-search"
  | "synthesizing"
  | "writing"
  | "done"

export type JobState = {
  id: string
  status: JobStatus
  phase: JobPhase
  query: string
  urls: string[]
  targetFolder: string
  notePath?: string
  noteTitle?: string
  error?: string
  createdAt: number
}

const jobs = new Map<string, JobState>()

export function createJob(
  query: string,
  urls: string[],
  targetFolder: string,
): JobState {
  const job: JobState = {
    id: crypto.randomUUID(),
    status: "running",
    phase: "vault-search",
    query,
    urls,
    targetFolder,
    createdAt: Date.now(),
  }
  jobs.set(job.id, job)
  return job
}

export function getJob(id: string): JobState | undefined {
  return jobs.get(id)
}

export function updateJob(id: string, patch: Partial<JobState>): void {
  const job = jobs.get(id)
  if (!job) return
  jobs.set(id, { ...job, ...patch })
}
