import * as SecureStore from "expo-secure-store";

// Point this at your Laravel API. For a physical device or Expo Go on your phone,
// 127.0.0.1 won't reach your computer — use your machine's LAN IP instead,
// e.g. http://192.168.1.20:8000/api. You can also set EXPO_PUBLIC_API_URL.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
const TOKEN_KEY = "showcase-token";

export type Paginated<T> = {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number };
};

export type ApiPerson = {
  id: number;
  tmdb_id: number;
  name: string;
  slug: string;
  biography?: string;
  profile_url: string | null;
  birthday: string | null;
  place_of_birth: string | null;
  role?: string;
  character?: string;
};

export type ApiFilm = {
  id: number;
  tmdb_id: number;
  title: string;
  original_title: string | null;
  slug: string;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  release_date: string | null;
  year: number | null;
  runtime: number | null;
  original_language: string | null;
  countries: string[] | null;
  genres: string[] | null;
  vote_average: number | null;
  comments_count?: number;
  likes_count?: number;
  viewer_liked?: boolean;
  viewer_watched?: boolean;
  viewer_rating?: number | null;
  viewer_log_id?: number | null;
  directors?: ApiPerson[];
  credits?: Record<string, ApiPerson[]>;
};

export type SearchResult = {
  tmdb_id: number;
  title: string;
  release_date: string | null;
  year: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  overview: string;
  vote_average?: number | null;
  genres?: string[];
  viewer_liked?: boolean;
  viewer_watched?: boolean;
  viewer_rating?: number | null;
  viewer_log_id?: number | null;
};

export type Genre = { id: number; name: string };

export type DiscoverParams = {
  genre?: number;
  year?: number;
  min_rating?: number;
  sort_by?: "popularity.desc" | "popularity.asc" | "vote_average.desc" | "vote_average.asc" | "primary_release_date.desc" | "primary_release_date.asc" | "title.asc";
  page?: number;
  upcoming?: boolean;
};

export type ApiUser = {
  id: number;
  name: string;
  username: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  member_since: string;
  stats?: { films_logged: number; lists: number; followers: number; following: number };
  is_followed_by_viewer?: boolean;
  favorite_films?: ApiFilm[];
  watchlist_is_public?: boolean;
};

export type ApiLog = {
  id: number;
  watched_on: string | null;
  is_rewatch: boolean;
  ratings: {
    overall: number | null;
    story: number | null;
    direction: number | null;
    acting: number | null;
    cinematography: number | null;
    music: number | null;
  };
  review: string | null;
  quote: string | null;
  quote_category: string | null;
  contains_spoilers: boolean;
  likes_count: number;
  liked_by_viewer?: boolean;
  comments_count?: number;
  user?: ApiUser;
  film?: ApiFilm;
  created_at: string;
};

export type ApiList = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  tags: string[] | null;
  is_ranked: boolean;
  is_public: boolean;
  items_count?: number;
  comments_count?: number;
  user?: ApiUser;
  items?: { id: number; position: number; note: string | null; film: ApiFilm }[];
  created_at: string;
  contains_film?: boolean;
};

export type CommentableType = "film" | "showcase" | "log";

export type ApiComment = {
  id: number;
  body: string;
  parent_id: number | null;
  user?: ApiUser;
  is_own?: boolean;
  replies?: ApiComment[];
  created_at: string;
};

export type UserStats = {
  films_logged: number;
  hours_watched: number;
  average_rating: number;
  top_genres: string[];
};

export type WatchProvider = { id: number; name: string; logo_url: string | null };

export type WatchProviders = {
  region: string | null;
  link: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
};

export type RelatedFilms = {
  recommended: SearchResult[];
  more_from_director: ApiFilm[];
};

export type NotificationType = "like" | "comment" | "follow" | "mention";

export type ApiNotification = {
  id: number;
  type: NotificationType;
  actor?: ApiUser;
  link: string | null;
  preview: string | null;
  read_at: string | null;
  created_at: string;
};

export type PersonFilmCredit = {
  tmdb_id: number;
  title: string;
  release_date: string | null;
  year: string | null;
  poster_url: string | null;
  overview: string;
  vote_average?: number | null;
  character?: string | null;
};

export type MentionUser = { username: string; name: string; avatar_url: string | null };
export type MentionRole = "director" | "writer" | "cinematographer" | "composer" | "actor";
export type MentionPerson = { slug: string; name: string; profile_url: string | null; role?: MentionRole | null };

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

let cachedToken: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  const value = await SecureStore.getItemAsync(TOKEN_KEY);
  cachedToken = value;
  return value;
}

export async function setToken(token: string | null) {
  cachedToken = token;
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// The hosted API (Render free tier) sleeps after 15 min idle and can take
// up to ~60s to wake on the next request — this has to comfortably outlast
// that cold start, or every first request after idle looks like a failure.
const REQUEST_TIMEOUT_MS = 60000;

type RequestOptions = RequestInit & { timeoutMs?: number };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs, ...fetchOptions } = options;
  const token = await getToken();
  // FormData (used for the avatar upload) needs its own auto-generated
  // multipart boundary in the Content-Type header — don't force JSON on it.
  const isFormData = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(fetchOptions.body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs ?? REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(
        `Can't reach the server at ${API_URL}. If you're on a phone or emulator, 127.0.0.1 won't reach your computer — set EXPO_PUBLIC_API_URL to your computer's LAN IP in mobile/.env and restart Expo.`,
        0
      );
    }
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    throw new ApiError(
      `Network request failed (${reason}). Check that the API is running and that EXPO_PUBLIC_API_URL (${API_URL}) is reachable from this device.`,
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 204) return undefined as T;

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(json.message ?? "Something went wrong.", response.status, json.errors);
  }

  return json as T;
}

export const api = {
  register: (data: { name: string; username: string; email: string; password: string; password_confirmation: string }) =>
    request<{ user: ApiUser; token: string }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<{ user: ApiUser; token: string }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),

  me: () => request<{ data: ApiUser }>("/auth/me"),

  updateMe: (data: { name?: string; username?: string; bio?: string; location?: string; watchlist_is_public?: boolean; avatar_path?: string | null }) =>
    request<{ data: ApiUser }>("/me", { method: "PATCH", body: JSON.stringify(data) }),

  // The client uploads straight to Cloudinary and only sends us back the
  // resulting secure_url via updateMe's avatar_path — see signCloudinaryUpload.
  signCloudinaryUpload: (folder: "avatars" | "showcase-covers") =>
    request<{ signature: string; timestamp: number; folder: string; api_key: string; cloud_name: string }>("/uploads/cloudinary-sign", {
      method: "POST",
      body: JSON.stringify({ folder }),
    }),

  addFavorite: (tmdbId: number) => request<{ data: ApiUser }>("/me/favorites", { method: "POST", body: JSON.stringify({ tmdb_id: tmdbId }) }),
  removeFavorite: (filmId: number) => request<{ data: ApiUser }>(`/me/favorites/${filmId}`, { method: "DELETE" }),

  searchUsers: (q: string, perPage?: number) =>
    request<Paginated<ApiUser>>(`/users/search?q=${encodeURIComponent(q)}${perPage ? `&per_page=${perPage}` : ""}`),

  searchFilms: (q: string) => request<{ data: SearchResult[] }>(`/films/search?q=${encodeURIComponent(q)}`),

  discoverFilms: (params: DiscoverParams = {}) => {
    const search = new URLSearchParams();
    if (params.genre) search.set("genre", String(params.genre));
    if (params.year) search.set("year", String(params.year));
    if (params.min_rating) search.set("min_rating", String(params.min_rating));
    if (params.sort_by) search.set("sort_by", params.sort_by);
    if (params.page) search.set("page", String(params.page));
    if (params.upcoming) search.set("upcoming", "1");
    const qs = search.toString();
    return request<{ data: SearchResult[]; meta: { page: number; total_pages: number } }>(`/films/discover${qs ? `?${qs}` : ""}`);
  },

  getGenres: () => request<{ data: Genre[] }>("/films/genres"),

  getFilm: (slug: string) => request<{ data: ApiFilm }>(`/films/${slug}`),

  syncFilm: (tmdbId: number) => request<{ data: ApiFilm }>("/films/sync", { method: "POST", body: JSON.stringify({ tmdb_id: tmdbId }) }),

  getLogs: (
    params: {
      username?: string;
      film_slug?: string;
      per_page?: number;
      following?: boolean;
      type?: "quote" | "review";
      category?: string;
      search?: string;
    } = {}
  ) => {
    const search = new URLSearchParams();
    if (params.username) search.set("username", params.username);
    if (params.film_slug) search.set("film_slug", params.film_slug);
    if (params.per_page) search.set("per_page", String(params.per_page));
    if (params.following) search.set("following", "1");
    if (params.type) search.set("type", params.type);
    if (params.category) search.set("category", params.category);
    if (params.search) search.set("search", params.search);
    const qs = search.toString();
    return request<Paginated<ApiLog>>(`/logs${qs ? `?${qs}` : ""}`);
  },

  createLog: (data: {
    tmdb_id: number;
    watched_on?: string;
    is_rewatch?: boolean;
    rating_story?: number | null;
    rating_direction?: number | null;
    rating_acting?: number | null;
    rating_cinematography?: number | null;
    rating_music?: number | null;
    review?: string;
    quote?: string;
    quote_category?: string;
    contains_spoilers?: boolean;
  }) => request<{ data: ApiLog }>("/logs", { method: "POST", body: JSON.stringify(data) }),

  getLog: (id: number) => request<{ data: ApiLog }>(`/logs/${id}`),

  // The update route validates through the same FormRequest as create, which
  // requires tmdb_id even though the controller excludes it from the actual
  // DB update — so callers must still pass it here.
  updateLog: (
    id: number,
    data: {
      tmdb_id: number;
      watched_on?: string;
      is_rewatch?: boolean;
      rating_story?: number | null;
      rating_direction?: number | null;
      rating_acting?: number | null;
      rating_cinematography?: number | null;
      rating_music?: number | null;
      review?: string;
      quote?: string;
      quote_category?: string;
      contains_spoilers?: boolean;
    }
  ) => request<{ data: ApiLog }>(`/logs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteLog: (id: number) => request<void>(`/logs/${id}`, { method: "DELETE" }),

  likeLog: (id: number) => request<{ data: ApiLog }>(`/logs/${id}/like`, { method: "POST" }),
  unlikeLog: (id: number) => request<{ data: ApiLog }>(`/logs/${id}/like`, { method: "DELETE" }),

  getFilmMyShowcases: (slug: string) => request<{ data: ApiList[] }>(`/films/${slug}/my-showcases`),

  getFilmShowcases: (slug: string) => request<{ data: ApiList[] }>(`/films/${slug}/showcases`),

  getFilmFriendsActivity: (slug: string) => request<{ data: ApiLog[] }>(`/films/${slug}/friends-activity`),

  getRelatedFilms: (slug: string) => request<{ data: RelatedFilms }>(`/films/${slug}/related`),

  getWatchProviders: (slug: string, region: string) =>
    request<{ data: WatchProviders }>(`/films/${slug}/watch-providers?region=${encodeURIComponent(region)}`),

  getPerson: (slug: string) => request<{ data: ApiPerson & { filmography: Record<string, PersonFilmCredit[]> } }>(`/people/${slug}`),

  searchMentions: (q: string, filmId?: number) =>
    request<{ data: { users: MentionUser[]; people: MentionPerson[] } }>(
      `/mentions/search?q=${encodeURIComponent(q)}${filmId ? `&film_id=${filmId}` : ""}`
    ),

  getLists: (username?: string, perPage?: number) => {
    const search = new URLSearchParams();
    if (username) search.set("username", username);
    if (perPage) search.set("per_page", String(perPage));
    const qs = search.toString();
    return request<Paginated<ApiList>>(`/lists${qs ? `?${qs}` : ""}`);
  },

  getList: (username: string, slug: string) => request<{ data: ApiList }>(`/lists/${username}/${slug}`),

  createList: (data: { name: string; description?: string; tags?: string[]; is_ranked?: boolean; is_public?: boolean }) =>
    request<{ data: ApiList }>("/lists", { method: "POST", body: JSON.stringify(data) }),

  updateList: (id: number, data: { name?: string; description?: string; tags?: string[]; is_ranked?: boolean; is_public?: boolean }) =>
    request<{ data: ApiList }>(`/lists/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteList: (id: number) => request<void>(`/lists/${id}`, { method: "DELETE" }),

  addListItem: (listId: number, tmdbId: number, note?: string) =>
    request<{ data: ApiList }>(`/lists/${listId}/items`, { method: "POST", body: JSON.stringify({ tmdb_id: tmdbId, note }) }),

  removeListItem: (listId: number, filmId: number) =>
    request<{ data: ApiList }>(`/lists/${listId}/items/${filmId}`, { method: "DELETE" }),

  reorderListItems: (listId: number, itemIds: number[]) =>
    request<{ data: ApiList }>(`/lists/${listId}/items/reorder`, { method: "PATCH", body: JSON.stringify({ item_ids: itemIds }) }),

  followUser: (username: string) => request<{ data: ApiUser }>(`/users/${username}/follow`, { method: "POST" }),
  unfollowUser: (username: string) => request<{ data: ApiUser }>(`/users/${username}/follow`, { method: "DELETE" }),
  getFollowers: (username: string) => request<Paginated<ApiUser>>(`/users/${username}/followers`),
  getFollowing: (username: string) => request<Paginated<ApiUser>>(`/users/${username}/following`),

  getUserWatchlist: (username: string, perPage?: number) =>
    request<Paginated<ApiFilm>>(`/users/${username}/watchlist${perPage ? `?per_page=${perPage}` : ""}`),

  getNotifications: () => request<Paginated<ApiNotification>>("/me/notifications"),
  markNotificationRead: (id: number) => request<{ data: ApiNotification }>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => request<void>("/me/notifications/read-all", { method: "PATCH" }),

  getWatchlist: (perPage?: number) => request<Paginated<ApiFilm>>(`/me/watchlist${perPage ? `?per_page=${perPage}` : ""}`),

  addWatchlist: (tmdbId: number) => request<{ data: ApiFilm }>("/watchlist", { method: "POST", body: JSON.stringify({ tmdb_id: tmdbId }) }),

  removeWatchlist: (filmId: number) => request<void>(`/watchlist/${filmId}`, { method: "DELETE" }),

  likeFilm: (tmdbId: number) => request<{ data: ApiFilm }>("/film-likes", { method: "POST", body: JSON.stringify({ tmdb_id: tmdbId }) }),

  unlikeFilm: (filmId: number) => request<void>(`/film-likes/${filmId}`, { method: "DELETE" }),

  getUser: (username: string) => request<{ data: ApiUser }>(`/users/${username}`),
  getUserStats: (username: string) => request<{ data: UserStats }>(`/users/${username}/stats`),

  getComments: (type: CommentableType, id: number) => request<{ data: ApiComment[] }>(`/comments?type=${type}&id=${id}`),
  createComment: (type: CommentableType, id: number, body: string, parentId?: number) =>
    request<{ data: ApiComment }>("/comments", { method: "POST", body: JSON.stringify({ type, id, body, parent_id: parentId }) }),
  deleteComment: (id: number) => request<void>(`/comments/${id}`, { method: "DELETE" }),
};
