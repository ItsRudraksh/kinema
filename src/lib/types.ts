export type TmdbRawMediaType = "movie" | "tv";

export type MediaCategory = "film" | "series" | "anime" | "drama" | "doc";

export type DiaryStatus =
  | "completed"
  | "watching"
  | "watchlist"
  | "on_hold"
  | "dropped";

export type ScreeningContext =
  | "Theater / IMAX"
  | "Late Night"
  | "Rainy Afternoon"
  | "With Friends"
  | "Rewatch"
  | "Solo Focus";

export interface DiaryEntry {
  key: string; // `${tmdbType}-${tmdbId}`
  tmdbId: number;
  tmdbType: TmdbRawMediaType;
  category: MediaCategory;
  title: string;
  originalTitle?: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: string;
  runtimeMinutes: number | null;
  totalEpisodes: number | null;
  totalSeasons: number | null;
  genres: string[];
  status: DiaryStatus;
  rating: number | null;
  favorite: boolean;
  fourFavoriteSlot: number | null;
  watchedEpisodes: number;
  currentSeason: number;
  watchedDate: string;
  loggedAt: string;
  context: ScreeningContext;
  moodTags: string[];
  quote: string;
  note: string;
  spoilerNote: string;
  collectionId?: number | null;
  collectionName?: string | null;
  peopleSnapshot?: { id: number; name: string; role: string }[];
  knownProviderIds?: number[];
}

export interface CosmosNode {
  key: string;
  tmdbId: number;
  tmdbType: TmdbRawMediaType;
  category: MediaCategory;
  title: string;
  posterPath: string | null;
  releaseYear: string;
  voteAverage: number;
  genres: string[];
  totalEpisodes: number | null;
  runtimeMinutes: number | null;
  diary?: DiaryEntry;
  source: "diary" | "watchlist" | "starter";
}

export interface PersonSearchHit {
  kind: "person";
  id: number;
  name: string;
  department: string;
  profilePath: string | null;
  knownForTitles: string[];
}

export interface WatchProviderItem {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface FranchiseCollection {
  id: number;
  name: string;
  posterPath: string | null;
  overview: string;
  parts: CosmosNode[];
}

export interface MediaDossier {
  key: string;
  tmdbId: number;
  tmdbType: TmdbRawMediaType;
  category: MediaCategory;
  title: string;
  originalTitle: string;
  tagline: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  releaseYear: string;
  runtimeMinutes: number | null;
  totalEpisodes: number | null;
  totalSeasons: number | null;
  statusText: string;
  voteAverage: number;
  genres: { id: number; name: string }[];
  creators: { id: number; name: string; role: string }[];
  cast: {
    id: number;
    name: string;
    character: string;
    profilePath: string | null;
  }[];
  trailerKey: string | null;
  providers: {
    region: string;
    link: string | null;
    flatrate: WatchProviderItem[];
    rent: WatchProviderItem[];
    buy: WatchProviderItem[];
  };
  recommendations: CosmosNode[];
  collection: FranchiseCollection | null;
  partial?: boolean;
}

export type CreditDepartment =
  | "Acting"
  | "Directing"
  | "Production"
  | "Writing"
  | "Crew";

export interface PersonCreditNode {
  key: string;
  tmdbId: number;
  tmdbType: TmdbRawMediaType;
  category: MediaCategory;
  title: string;
  posterPath: string | null;
  releaseDate: string;
  releaseYear: string;
  roles: string[];
  departments: CreditDepartment[];
  episodeCount: number | null;
  isTalkOrArchive: boolean;
  isUpcoming: boolean;
  voteAverage: number;
  popularity: number;
}

export interface PersonConstellation {
  id: number;
  name: string;
  department: string;
  profilePath: string | null;
  biography: string;
  birthday: string | null;
  placeOfBirth: string | null;
  credits: PersonCreditNode[];
}

export interface OttRadarItem {
  entry: DiaryEntry;
  region: string;
  flatrate: WatchProviderItem[];
  rent: WatchProviderItem[];
  globalFallback: {
    region: string;
    providers: WatchProviderItem[];
  } | null;
  newlyAvailable: boolean;
}

export interface OrbisDatabaseSchema {
  version: 1;
  region: string;
  entries: Record<string, DiaryEntry>;
}
