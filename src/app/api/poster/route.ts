import { NextRequest, NextResponse } from "next/server";

const ALLOWED_SIZES = new Set(["w185", "w342", "w500", "w780", "original"]);

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  const size = req.nextUrl.searchParams.get("size") || "w342";

  if (!path || !path.startsWith("/") || path.includes("..")) {
    return new NextResponse("Invalid poster path", { status: 400 });
  }

  const safeSize = ALLOWED_SIZES.has(size) ? size : "w342";
  const upstreamUrl = `https://image.tmdb.org/t/p/${safeSize}${path}`;

  try {
    const res = await fetch(upstreamUrl, {
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) {
      return new NextResponse("Poster unavailable", { status: 404 });
    }
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }
}
