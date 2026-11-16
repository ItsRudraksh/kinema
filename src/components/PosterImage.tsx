"use client";

import { useState } from "react";
import { Film } from "lucide-react";
import type { MediaCategory } from "@/lib/types";

interface PosterImageProps {
  posterPath: string | null;
  title: string;
  category?: MediaCategory;
  size?: "w185" | "w342" | "w500";
  className?: string;
}

export function PosterImage({
  posterPath,
  title,
  category = "film",
  size = "w342",
  className = "",
}: PosterImageProps) {
  const [failed, setFailed] = useState(false);

  if (!posterPath || failed) {
    return (
      <div
        className={`relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#141824] via-[#0d1017] to-[#06070a] p-3 text-left border border-white/10 ${className}`}
      >
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-400">
          <span>{category}</span>
          <Film className="size-3.5 text-amber-400/80 shrink-0" />
        </div>
        <p className="font-serif text-base leading-tight text-zinc-100 line-clamp-3">
          {title}
        </p>
      </div>
    );
  }

  return (
    <img
      src={`/api/poster?path=${encodeURIComponent(posterPath)}&size=${size}`}
      alt={title}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-cover bg-[#0d1017] ${className}`}
    />
  );
}
