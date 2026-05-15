import { describe, it, expect } from "vitest"
import { createJob, getJob, updateJob } from "./research-jobs"

describe("research-jobs", () => {
  it("createJob returns a job with status running", () => {
    const job = createJob("test query", [], "03_Knowledge/IT/")
    expect(job.status).toBe("running")
    expect(job.query).toBe("test query")
    expect(job.urls).toEqual([])
    expect(job.targetFolder).toBe("03_Knowledge/IT/")
    expect(job.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("getJob returns undefined for unknown id", () => {
    expect(getJob("nonexistent")).toBeUndefined()
  })

  it("getJob returns created job", () => {
    const job = createJob("q", [], "03_Knowledge/")
    expect(getJob(job.id)).toEqual(job)
  })

  it("updateJob merges fields", () => {
    const job = createJob("q", [], "03_Knowledge/")
    updateJob(job.id, { status: "done", notePath: "03_Knowledge/test.md", noteTitle: "Test" })
    const updated = getJob(job.id)
    expect(updated?.status).toBe("done")
    expect(updated?.notePath).toBe("03_Knowledge/test.md")
    expect(updated?.query).toBe("q")
  })
})
