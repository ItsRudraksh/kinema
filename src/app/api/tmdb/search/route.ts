import { NextRequest, NextResponse } from "next/server";
import { searchMultiWithPeople } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const { media, people } = await searchMultiWithPeople(q);
  return NextResponse.json({ results: media, people });
}
