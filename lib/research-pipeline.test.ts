import { describe, it, expect } from "vitest"
import { extractKeywords, slugify } from "./research-pipeline"

describe("extractKeywords", () => {
  it("returns lowercase unique words, filtered short ones", () => {
    const result = extractKeywords("Differences between Skills and Agents in LLM")
    expect(result).toContain("differences")
    expect(result).toContain("skills")
    expect(result).toContain("agents")
    expect(result).not.toContain("in")
    expect(result).not.toContain("and")
  })
})

describe("slugify", () => {
  it("converts title to safe filename", () => {
    expect(slugify("Skills vs Agents in LLM")).toBe("skills-vs-agents-in-llm")
  })

  it("strips special characters", () => {
    expect(slugify("Różnice między A a B")).toBe("roznice-miedzy-a-a-b")
  })
})
