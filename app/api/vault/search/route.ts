import { type NextRequest, NextResponse } from "next/server"
import { searchVault } from "@/lib/search"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q") ?? ""

  if (q.length < 2) {
    return NextResponse.json([])
  }

  const results = searchVault(q)
  return NextResponse.json(results)
}
