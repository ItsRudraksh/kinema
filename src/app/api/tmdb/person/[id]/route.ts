import { NextRequest, NextResponse } from "next/server";
import { fetchPersonConstellation } from "@/lib/tmdb";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }

  const person = await fetchPersonConstellation(numId);
  if (!person) {
    return NextResponse.json(
      { error: "Person constellation unavailable" },
      { status: 503 },
    );
  }
  return NextResponse.json({ person });
}
