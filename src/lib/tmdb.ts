import { classifyMedia, mapGenreIds } from "./classify";
import { FALLBACK_STARTER_NODES } from "./starter-cosmos";
import type {
  CosmosNode,
  CreditDepartment,
  DiaryEntry,
  FranchiseCollection,
  MediaDossier,
  OttRadarItem,
  PersonConstellation,
  PersonCreditNode,
  PersonSearchHit,
  TmdbRawMediaType,
  WatchProviderItem,
} from "./types";

const TMDB_BASE = "https://api.themoviedb.org/3";

function getToken(): string | null {
  return process.env.TMDB_ACCESS_TOKEN?.trim() || null;
}

export async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
  revalidateSeconds = 3600,
  retries = 3,
): Promise<T | null> {
  const token = getToken();
  if (!token) return null;

  const url = new URL(`${TMDB_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(7500),
        ...(revalidateSeconds > 0
          ? { next: { revalidate: revalidateSeconds } }
          : { cache: "no-store" }),
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 200 * attempt));
        continue;
      }
      return null;
    } catch {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 250 * attempt));
        continue;
      }
      return null;
    }
  }
  return null;
}

interface TmdbListItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  origin_country?: string[];
  original_language?: string;
  known_for_department?: string;
  profile_path?: string | null;
  known_for?: TmdbListItem[];
}

function normalizeNode(
  item: TmdbListItem,
  fallbackType: TmdbRawMediaType,
): CosmosNode | null {
  const rawType =
    item.media_type === "movie" || item.media_type === "tv"
      ? item.media_type
      : fallbackType;
  if (!item.id || (!item.title && !item.name)) return null;

  const title = item.title || item.name || "Untitled";
  const date = item.release_date || item.first_air_date || "";
  const category = classifyMedia({
    mediaType: rawType,
    genreIds: item.genre_ids,
    originCountry: item.origin_country,
    originalLanguage: item.original_language,
  });

  return {
    key: `${rawType}-${item.id}`,
    tmdbId: item.id,
    tmdbType: rawType,
    category,
    title,
    posterPath: item.poster_path ?? null,
    releaseYear: date ? date.slice(0, 4) : "—",
    voteAverage: Number((item.vote_average ?? 0).toFixed(1)),
    genres: mapGenreIds(item.genre_ids, rawType),
    totalEpisodes: null,
    runtimeMinutes: null,
    source: "starter",
  };
}

export async function searchMultiWithPeople(query: string): Promise<{
  media: CosmosNode[];
  people: PersonSearchHit[];
}> {
  const q = query.trim();
  if (!q) return { media: [], people: [] };

  const data = await tmdbFetch<{ results: TmdbListItem[] }>(
    "/search/multi",
    { query: q, include_adult: "false", language: "en-US", page: 1 },
    300,
    3,
  );
  if (!data?.results) return { media: [], people: [] };

  const media = data.results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .map((r) => normalizeNode(r, r.media_type as TmdbRawMediaType))
    .filter((n): n is CosmosNode => Boolean(n))
    .slice(0, 20);

  const people: PersonSearchHit[] = data.results
    .filter((r) => r.media_type === "person" && r.name)
    .slice(0, 6)
    .map((p) => ({
      kind: "person",
      id: p.id,
      name: p.name || "Unknown",
      department: p.known_for_department || "Acting",
      profilePath: p.profile_path ?? null,
      knownForTitles: (p.known_for ?? [])
        .map((k) => k.title || k.name || "")
        .filter(Boolean)
        .slice(0, 3),
    }));

  return { media, people };
}

export async function fetchStarterCosmos(
  pageOffset = 1,
  personalSeeds: { tmdbType: TmdbRawMediaType; tmdbId: number }[] = [],
): Promise<CosmosNode[]> {
  const page = Math.max(1, ((pageOffset - 1) % 5) + 1);
  const seedCalls = personalSeeds
    .slice(0, 2)
    .map((s) =>
      tmdbFetch<{ results: TmdbListItem[] }>(
        `/${s.tmdbType}/${s.tmdbId}/recommendations`,
        { page: 1 },
        1800,
      ),
    );

  const [
    trendingAll,
    topFilms,
    topSeries,
    animeSeries,
    dramaSeries,
    animeFilms,
    docs,
    ...seedResults
  ] = await Promise.all([
    tmdbFetch<{ results: TmdbListItem[] }>("/trending/all/week", { page }),
    tmdbFetch<{ results: TmdbListItem[] }>("/movie/top_rated", { page }),
    tmdbFetch<{ results: TmdbListItem[] }>("/tv/top_rated", { page }),
    tmdbFetch<{ results: TmdbListItem[] }>("/discover/tv", {
      with_genres: "16",
      with_origin_country: "JP",
      sort_by: "vote_count.desc",
      page,
    }),
    tmdbFetch<{ results: TmdbListItem[] }>("/discover/tv", {
      with_origin_country: "KR",
      with_genres: "18",
      sort_by: "popularity.desc",
      page,
    }),
    tmdbFetch<{ results: TmdbListItem[] }>("/discover/movie", {
      with_genres: "16",
      with_origin_country: "JP",
      sort_by: "vote_count.desc",
      page,
    }),
    tmdbFetch<{ results: TmdbListItem[] }>("/discover/movie", {
      with_genres: "99",
      sort_by: "vote_count.desc",
      page,
    }),
    ...seedCalls,
  ]);

  const combined: CosmosNode[] = [];
  const seen = new Set<string>();

  const pushList = (
    res: { results: TmdbListItem[] } | null,
    fallbackType: TmdbRawMediaType,
  ) => {
    for (const item of res?.results ?? []) {
      const node = normalizeNode(item, fallbackType);
      if (node && node.posterPath && !seen.has(node.key)) {
        seen.add(node.key);
        combined.push(node);
      }
    }
  };

  seedResults.forEach((res, idx) => {
    if (personalSeeds[idx]) {
      pushList(res, personalSeeds[idx].tmdbType);
    }
  });
  pushList(trendingAll, "movie");
  pushList(topFilms, "movie");
  pushList(topSeries, "tv");
  pushList(animeSeries, "tv");
  pushList(dramaSeries, "tv");
  pushList(animeFilms, "movie");
  pushList(docs, "movie");

  if (combined.length === 0) {
    return FALLBACK_STARTER_NODES;
  }

  return combined.slice(0, 128);
}

export async function fetchDailyTrending(): Promise<CosmosNode[]> {
  const data = await tmdbFetch<{ results: TmdbListItem[] }>(
    "/trending/all/day",
    { language: "en-US" },
    900,
    3,
  );
  return (data?.results ?? [])
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .map((r) => normalizeNode(r, r.media_type as TmdbRawMediaType))
    .filter((n): n is CosmosNode => Boolean(n && n.posterPath))
    .slice(0, 10);
}

interface RawCollectionResponse {
  id: number;
  name: string;
  overview?: string;
  poster_path?: string | null;
  parts?: TmdbListItem[];
}

interface RawDossierResponse {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  tagline?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_episodes?: number | null;
  number_of_seasons?: number | null;
  status?: string;
  type?: string;
  vote_average?: number;
  origin_country?: string[];
  original_language?: string;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path?: string | null;
  } | null;
  genres?: { id: number; name: string }[];
  created_by?: { id: number; name: string }[];
  credits?: {
    cast?: {
      id: number;
      name: string;
      character?: string;
      profile_path?: string | null;
    }[];
    crew?: { id: number; name: string; job?: string }[];
  };
  videos?: {
    results?: { site: string; type: string; key: string; official?: boolean }[];
  };
  "watch/providers"?: {
    results?: Record<
      string,
      {
        link?: string;
        flatrate?: WatchProviderItem[];
        rent?: WatchProviderItem[];
        buy?: WatchProviderItem[];
      }
    >;
  };
  recommendations?: { results?: TmdbListItem[] };
  keywords?: {
    keywords?: { id: number; name: string }[];
    results?: { id: number; name: string }[];
  };
}

export async function fetchMediaDossier(
  mediaType: TmdbRawMediaType,
  id: number,
  region: string,
): Promise<MediaDossier | null> {
  let partial = false;
  let data = await tmdbFetch<RawDossierResponse>(
    `/${mediaType}/${id}`,
    {
      append_to_response:
        "credits,videos,watch/providers,recommendations,keywords",
      language: "en-US",
    },
    1800,
    3,
  );

  if (!data) {
    partial = true;
    data = await tmdbFetch<RawDossierResponse>(
      `/${mediaType}/${id}`,
      { language: "en-US" },
      0,
      3,
    );
  }
  if (!data) return null;

  let collection: FranchiseCollection | null = null;
  if (mediaType === "movie" && data.belongs_to_collection?.id) {
    const col = await tmdbFetch<RawCollectionResponse>(
      `/collection/${data.belongs_to_collection.id}`,
      { language: "en-US" },
      3600,
      3,
    );
    if (col?.parts?.length) {
      const sortedParts = [...col.parts]
        .sort((a, b) =>
          (a.release_date || "9999").localeCompare(b.release_date || "9999"),
        )
        .map((p) => normalizeNode(p, "movie"))
        .filter((n): n is CosmosNode => Boolean(n));

      if (sortedParts.length > 1) {
        collection = {
          id: col.id,
          name: col.name,
          posterPath: col.poster_path ?? null,
          overview: col.overview || "",
          parts: sortedParts,
        };
      }
    }
  }

  const keywordIds = [
    ...(data.keywords?.keywords ?? []),
    ...(data.keywords?.results ?? []),
  ].map((k) => k.id);

  const category = classifyMedia({
    mediaType,
    genres: data.genres,
    originCountry: data.origin_country,
    originalLanguage: data.original_language,
    showType: data.type,
    keywordIds,
  });

  const directors =
    data.credits?.crew
      ?.filter((c) => c.job === "Director" || c.job === "Series Director")
      .slice(0, 3)
      .map((c) => ({ id: c.id, name: c.name, role: c.job || "Director" })) ??
    [];

  const creators =
    mediaType === "tv" && data.created_by?.length
      ? data.created_by.map((c) => ({
          id: c.id,
          name: c.name,
          role: "Creator",
        }))
      : directors;

  const trailer =
    data.videos?.results?.find(
      (v) => v.site === "YouTube" && v.type === "Trailer" && v.official,
    ) ||
    data.videos?.results?.find(
      (v) =>
        v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
    );

  const regionUpper = region.toUpperCase();
  const providerData = data["watch/providers"]?.results?.[regionUpper];

  const date = data.release_date || data.first_air_date || "";
  const epRuntime =
    mediaType === "movie"
      ? (data.runtime ?? null)
      : (data.episode_run_time?.[0] ?? 45);

  const recommendations = (data.recommendations?.results ?? [])
    .map((r) => normalizeNode(r, mediaType))
    .filter((n): n is CosmosNode => Boolean(n && n.posterPath))
    .slice(0, 8);

  return {
    key: `${mediaType}-${data.id}`,
    tmdbId: data.id,
    tmdbType: mediaType,
    category,
    title: data.title || data.name || "Untitled",
    originalTitle: data.original_title || data.original_name || "",
    tagline: data.tagline || "",
    overview: data.overview || "No synopsis available yet.",
    posterPath: data.poster_path ?? null,
    backdropPath: data.backdrop_path ?? null,
    releaseDate: date,
    releaseYear: date ? date.slice(0, 4) : "—",
    runtimeMinutes: epRuntime,
    totalEpisodes: data.number_of_episodes ?? null,
    totalSeasons: data.number_of_seasons ?? null,
    statusText: data.status || "",
    voteAverage: Number((data.vote_average ?? 0).toFixed(1)),
    genres: data.genres ?? [],
    creators,
    cast: (data.credits?.cast ?? []).slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character || "",
      profilePath: c.profile_path ?? null,
    })),
    trailerKey: trailer?.key ?? null,
    providers: {
      region: regionUpper,
      link: providerData?.link ?? null,
      flatrate: providerData?.flatrate ?? [],
      rent: providerData?.rent ?? [],
      buy: providerData?.buy ?? [],
    },
    recommendations,
    collection,
    partial,
  };
}

interface RawPersonResponse {
  id: number;
  name: string;
  known_for_department?: string;
  profile_path?: string | null;
  biography?: string;
  birthday?: string | null;
  place_of_birth?: string | null;
  combined_credits?: {
    cast?: (TmdbListItem & {
      character?: string;
      order?: number;
      episode_count?: number;
    })[];
    crew?: (TmdbListItem & {
      job?: string;
      department?: string;
      episode_count?: number;
    })[];
  };
}

function mapCrewDepartment(dept?: string, job?: string): CreditDepartment {
  const d = (dept || "").toLowerCase();
  const j = (job || "").toLowerCase();
  if (d === "directing" || j.includes("director")) return "Directing";
  if (d === "production" || j.includes("producer")) return "Production";
  if (
    d === "writing" ||
    j.includes("writer") ||
    j.includes("screenplay") ||
    j.includes("story")
  ) {
    return "Writing";
  }
  return "Crew";
}

export async function fetchPersonConstellation(
  personId: number,
): Promise<PersonConstellation | null> {
  const data = await tmdbFetch<RawPersonResponse>(
    `/person/${personId}`,
    { append_to_response: "combined_credits", language: "en-US" },
    3600,
    3,
  );
  if (!data) return null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const byKey = new Map<string, PersonCreditNode>();

  const upsertCredit = (
    item: TmdbListItem & { episode_count?: number },
    role: string,
    department: CreditDepartment,
    isTalkOrArchive: boolean,
  ) => {
    if (item.media_type !== "movie" && item.media_type !== "tv") return;
    const rawType = item.media_type;
    const title = item.title || item.name;
    if (!title || !item.id) return;

    const key = `${rawType}-${item.id}`;
    const existing = byKey.get(key);
    if (existing) {
      if (role && !existing.roles.includes(role)) {
        existing.roles.push(role);
      }
      if (!existing.departments.includes(department)) {
        existing.departments.push(department);
      }
      if (!isTalkOrArchive) {
        existing.isTalkOrArchive = false;
      }
      if (item.episode_count && !existing.episodeCount) {
        existing.episodeCount = item.episode_count;
      }
      return;
    }

    const releaseDate = item.release_date || item.first_air_date || "";
    const isUpcoming = !releaseDate || releaseDate > todayIso;
    const category = classifyMedia({
      mediaType: rawType,
      genreIds: item.genre_ids,
      originCountry: item.origin_country,
      originalLanguage: item.original_language,
    });

    byKey.set(key, {
      key,
      tmdbId: item.id,
      tmdbType: rawType,
      category,
      title,
      posterPath: item.poster_path ?? null,
      releaseDate,
      releaseYear: releaseDate ? releaseDate.slice(0, 4) : "TBA",
      roles: role ? [role] : [],
      departments: [department],
      episodeCount: item.episode_count ?? null,
      isTalkOrArchive,
      isUpcoming,
      voteAverage: Number((item.vote_average ?? 0).toFixed(1)),
      popularity: item.popularity ?? 0,
    });
  };

  for (const c of data.combined_credits?.cast ?? []) {
    const gSet = new Set(c.genre_ids ?? []);
    const char = c.character || "";
    const isTalkOrArchive =
      (c.media_type === "tv" && (gSet.has(10767) || gSet.has(10763))) ||
      /archive footage/i.test(char) ||
      (c.media_type === "tv" && /\bself\b/i.test(char));

    upsertCredit(c, char || "Cast", "Acting", isTalkOrArchive);
  }

  for (const c of data.combined_credits?.crew ?? []) {
    const gSet = new Set(c.genre_ids ?? []);
    const isTalkOrArchive =
      c.media_type === "tv" && (gSet.has(10767) || gSet.has(10763));
    const dept = mapCrewDepartment(c.department, c.job);
    upsertCredit(c, c.job || dept, dept, isTalkOrArchive);
  }

  // Zero cutoff: return 100% of credits, with Upcoming/TBA pinned cleanly at the top!
  const credits = Array.from(byKey.values()).sort((a, b) => {
    if (a.isUpcoming !== b.isUpcoming) {
      return a.isUpcoming ? -1 : 1;
    }
    if (!a.releaseDate && !b.releaseDate) {
      return b.popularity - a.popularity;
    }
    if (!a.releaseDate) return -1;
    if (!b.releaseDate) return 1;
    return b.releaseDate.localeCompare(a.releaseDate);
  });

  return {
    id: data.id,
    name: data.name,
    department: data.known_for_department || "Acting",
    profilePath: data.profile_path ?? null,
    biography: data.biography || "",
    birthday: data.birthday ?? null,
    placeOfBirth: data.place_of_birth ?? null,
    credits,
  };
}

export async function checkWatchlistOttRadar(
  entries: DiaryEntry[],
  region: string,
): Promise<OttRadarItem[]> {
  const watchlist = entries
    .filter((e) => e.status === "watchlist")
    .slice(0, 16);

  const regionUpper = region.toUpperCase();
  const fallbackRegions = ["US", "GB", "JP"].filter((r) => r !== regionUpper);

  const results = await Promise.all(
    watchlist.map(async (entry): Promise<OttRadarItem> => {
      const resp = await tmdbFetch<{
        results?: Record<
          string,
          {
            flatrate?: WatchProviderItem[];
            rent?: WatchProviderItem[];
          }
        >;
      }>(`/${entry.tmdbType}/${entry.tmdbId}/watch/providers`, {}, 1800, 3);

      const allRegions = resp?.results ?? {};
      const local = allRegions[regionUpper];
      const flatrate = local?.flatrate ?? [];
      const rent = local?.rent ?? [];

      let globalFallback: OttRadarItem["globalFallback"] = null;
      if (flatrate.length === 0 && rent.length === 0) {
        for (const rCode of fallbackRegions) {
          const alt = allRegions[rCode]?.flatrate ?? [];
          if (alt.length > 0) {
            globalFallback = { region: rCode, providers: alt.slice(0, 4) };
            break;
          }
        }
      }

      const prevIds = new Set(entry.knownProviderIds ?? []);
      const newlyAvailable =
        flatrate.length > 0 &&
        (prevIds.size === 0 ||
          flatrate.some((p) => !prevIds.has(p.provider_id)));

      return {
        entry,
        region: regionUpper,
        flatrate,
        rent,
        globalFallback,
        newlyAvailable,
      };
    }),
  );

  return results;
}

export async function discoverSurpriseNodes(params: {
  category?: string;
  maxRuntime?: number;
  seedType?: TmdbRawMediaType;
  seedId?: number;
}): Promise<CosmosNode[]> {
  if (params.seedId && params.seedType) {
    const rec = await tmdbFetch<{ results: TmdbListItem[] }>(
      `/${params.seedType}/${params.seedId}/recommendations`,
      { page: 1 },
      1800,
      3,
    );
    const list = (rec?.results ?? [])
      .map((r) => normalizeNode(r, params.seedType!))
      .filter((n): n is CosmosNode => Boolean(n && n.posterPath));
    if (list.length > 0) return list;
  }

  const isTv =
    params.category === "series" ||
    params.category === "anime" ||
    params.category === "drama";
  const endpoint = isTv ? "/discover/tv" : "/discover/movie";
  const query: Record<string, string | number> = {
    sort_by: "vote_average.desc",
    "vote_count.gte": 200,
    page: Math.floor(Math.random() * 4) + 1,
  };

  if (params.category === "anime") {
    query.with_genres = "16";
    query.with_origin_country = "JP";
  } else if (params.category === "drama") {
    query.with_origin_country = "KR|JP";
    query.with_genres = "18";
  } else if (params.category === "doc") {
    query.with_genres = "99";
  }
  if (params.maxRuntime && !isTv) {
    query["with_runtime.lte"] = params.maxRuntime;
  }

  const data = await tmdbFetch<{ results: TmdbListItem[] }>(
    endpoint,
    query,
    600,
    3,
  );
  return (data?.results ?? [])
    .map((r) => normalizeNode(r, isTv ? "tv" : "movie"))
    .filter((n): n is CosmosNode => Boolean(n && n.posterPath));
}
