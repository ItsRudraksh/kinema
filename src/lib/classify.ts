import type { MediaCategory, TmdbRawMediaType } from "./types";

const GENRE_MAP_MOVIE: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const GENRE_MAP_TV: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

export function mapGenreIds(
  ids: number[] | undefined,
  mediaType: TmdbRawMediaType,
): string[] {
  if (!ids || ids.length === 0) return [];
  const dict = mediaType === "movie" ? GENRE_MAP_MOVIE : GENRE_MAP_TV;
  return ids.map((id) => dict[id]).filter(Boolean);
}

interface ClassifyInput {
  mediaType: TmdbRawMediaType;
  genreIds?: number[];
  genres?: { id: number; name: string }[];
  originCountry?: string[];
  originalLanguage?: string;
  showType?: string;
  keywordIds?: number[];
}

export function classifyMedia(input: ClassifyInput): MediaCategory {
  const gIds = new Set([
    ...(input.genreIds ?? []),
    ...(input.genres?.map((g) => g.id) ?? []),
  ]);
  const origins = new Set(
    (input.originCountry ?? []).map((c) => c.toUpperCase()),
  );
  const lang = (input.originalLanguage ?? "").toLowerCase();
  const showType = (input.showType ?? "").toLowerCase();
  const keywords = new Set(input.keywordIds ?? []);

  // Documentary priority
  if (gIds.has(99) || showType === "documentary") {
    return "doc";
  }

  // Anime: Japanese animation or TMDB anime keyword (210024)
  if (
    keywords.has(210024) ||
    (gIds.has(16) && (origins.has("JP") || lang === "ja"))
  ) {
    return "anime";
  }

  if (input.mediaType === "tv") {
    // Asian & regional serialized dramas (K-Drama, C-Drama, J-Drama, Indian dramas)
    const dramaOrigins = ["KR", "CN", "TW", "TH", "TR", "JP", "IN"];
    const hasAsianDramaOrigin = dramaOrigins.some((c) => origins.has(c));
    if (
      hasAsianDramaOrigin &&
      !gIds.has(16) &&
      (gIds.has(18) || gIds.has(10749) || gIds.has(9648) || gIds.has(80))
    ) {
      return "drama";
    }
    return "series";
  }

  return "film";
}

export function formatCategoryLabel(cat: MediaCategory): string {
  switch (cat) {
    case "film":
      return "Film";
    case "series":
      return "Series & Web";
    case "anime":
      return "Anime";
    case "drama":
      return "Drama";
    case "doc":
      return "Documentary";
  }
}

export function formatCount(
  count: number,
  singular: string,
  plural: string,
): string {
  const rules = new Intl.PluralRules("en-US");
  const num = new Intl.NumberFormat("en-US").format(count);
  return `${num} ${rules.select(count) === "one" ? singular : plural}`;
}

export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
