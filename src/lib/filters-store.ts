import { useCallback, useSyncExternalStore } from "react";
import type { MediaItem } from "../data/vexia";

/**
 * Filtros inteligentes do VÉXIA TV.
 * Trabalha sobre os dados já carregados da lista M3U/HLS, complementados
 * pelo TMDB (gênero, ano, país, nota, duração, lançamento).
 * Tudo é salvo localmente — funciona offline.
 */
export type FilterKey =
  | "tipo"
  | "genero"
  | "ano"
  | "pais"
  | "audio"
  | "nota"
  | "duracao"
  | "lancamento";

export type FilterState = Record<FilterKey, string>;

export type FilterGroup = {
  key: FilterKey;
  title: string;
  options: string[];
};

export const FILTER_GROUPS: FilterGroup[] = [
  {
    key: "tipo",
    title: "TIPO",
    options: [
      "Todos",
      "Filmes",
      "Séries",
      "Canais",
      "Kids",
      "Anime",
      "Documentários",
      "Reality",
    ],
  },
  {
    key: "genero",
    title: "GÊNERO",
    options: [
      "Todos",
      "Ação",
      "Drama",
      "Comédia",
      "Terror",
      "Ficção",
      "Animação",
      "Romance",
      "Suspense",
      "Guerra",
      "Esporte",
      "Musical",
    ],
  },
  {
    key: "ano",
    title: "ANO",
    options: ["Todos", "2026", "2025", "2024", "2020-2023", "Antes de 2020"],
  },
  {
    key: "pais",
    title: "PAÍS",
    options: [
      "Todos",
      "Brasil",
      "EUA",
      "Portugal",
      "Japão",
      "Coreia",
      "México",
      "Espanha",
      "França",
      "Alemanha",
      "Itália",
      "Reino Unido",
      "Argentina",
      "Canadá",
    ],
  },
  {
    key: "audio",
    title: "ÁUDIO",
    options: ["Todos", "Português", "Inglês", "Espanhol", "Legendado"],
  },
  { key: "nota", title: "CLASSIFICAÇÃO TMDB", options: ["Todos", "9.0+", "8.0+", "7.0+", "6.0+"] },
  {
    key: "duracao",
    title: "DURAÇÃO",
    options: ["Todos", "< 90 min", "90-120 min", "120-150 min", "> 150 min"],
  },
  {
    key: "lancamento",
    title: "LANÇAMENTO",
    options: ["Todos", "Última semana", "Último mês", "Último trimestre", "Último ano"],
  },
];

export const COUNTRY_CODES: Record<string, string[]> = {
  Brasil: ["BR"],
  EUA: ["US"],
  Portugal: ["PT"],
  Japão: ["JP"],
  Coreia: ["KR"],
  México: ["MX"],
  Espanha: ["ES"],
  França: ["FR"],
  Alemanha: ["DE"],
  Itália: ["IT"],
  "Reino Unido": ["GB", "UK"],
  Argentina: ["AR"],
  Canadá: ["CA"],
};

export const EMPTY_FILTERS: FilterState = {
  tipo: "Todos",
  genero: "Todos",
  ano: "Todos",
  pais: "Todos",
  audio: "Todos",
  nota: "Todos",
  duracao: "Todos",
  lancamento: "Todos",
};

const KEY = "vexia:filters";
const listeners = new Set<() => void>();
let cache: FilterState | null = null;

function read(): FilterState {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = EMPTY_FILTERS);
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY_FILTERS, ...(JSON.parse(raw) as Partial<FilterState>) } : EMPTY_FILTERS;
  } catch {
    cache = EMPTY_FILTERS;
  }
  return cache;
}

function persist(next: FilterState) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  for (const fn of listeners) fn();
}

export function getFilters() {
  return read();
}

export function setFilter(key: FilterKey, value: string) {
  persist({ ...read(), [key]: value });
}

export function setFilters(next: FilterState) {
  persist(next);
}

export function clearFilters() {
  persist(EMPTY_FILTERS);
}

export function countActive(state: FilterState) {
  return Object.values(state).filter((v) => v !== "Todos").length;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useFilters() {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY_FILTERS);
  const set = useCallback((key: FilterKey, value: string) => setFilter(key, value), []);
  return { filters: state, set, clear: clearFilters, active: countActive(state) };
}

/* ───────────────────── ordenação ───────────────────── */

export type SortKey = "az" | "nota" | "recentes";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "az", label: "A → Z" },
  { key: "nota", label: "Nota" },
  { key: "recentes", label: "Mais recentes" },
];

const SORT_KEY = "vexia:sort";
const sortListeners = new Set<() => void>();
let sortCache: SortKey | null = null;

function readSort(): SortKey {
  if (sortCache) return sortCache;
  if (typeof window === "undefined") return (sortCache = "az");
  const raw = window.localStorage.getItem(SORT_KEY) as SortKey | null;
  // "relevancia" é a chave antiga: migra silenciosamente para alfabética.
  sortCache = raw === "nota" || raw === "recentes" ? raw : "az";
  return sortCache;
}

export function setSort(next: SortKey) {
  sortCache = next;
  try {
    window.localStorage.setItem(SORT_KEY, next);
  } catch {
    /* ignore */
  }
  for (const fn of sortListeners) fn();
}

export function useSort() {
  const sort = useSyncExternalStore(
    (fn) => {
      sortListeners.add(fn);
      return () => sortListeners.delete(fn);
    },
    readSort,
    () => "az" as SortKey,
  );
  return { sort, setSort };
}

function releaseTime(item: MediaItem) {
  if (item.releaseDate) {
    const t = Date.parse(item.releaseDate);
    if (!Number.isNaN(t)) return t;
  }
  return item.year > 0 ? Date.UTC(item.year, 0, 1) : 0;
}

/** Ordena: A→Z pelo título, por nota ou pelos lançamentos mais recentes. */
export function sortMedia<T extends MediaItem>(items: T[], sort: SortKey): T[] {
  const copy = [...items];
  if (sort === "az") copy.sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { numeric: true }));
  else if (sort === "nota") copy.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else copy.sort((a, b) => releaseTime(b) - releaseTime(a));
  return copy;
}

/** Canais: A→Z, ordem da lista ou fim da lista primeiro. */
export function sortChannels<T extends { name: string }>(items: T[], sort: SortKey): T[] {
  if (sort === "az")
    return [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
  if (sort === "nota") return items;
  return [...items].reverse();
}

/* ───────────────────── matching ───────────────────── */

function norm(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const TAG_RE: Record<string, RegExp> = {
  Kids: /\b(kids?|infantil|criancas?|desenhos?)\b/,
  Anime: /\b(anime|animes|otaku)\b/,
  Documentários: /\b(doc|docs|documentari[oa]s?|documentary)\b/,
  Reality: /\b(reality|realities|bbb|talk ?show)\b/,
};

/** Texto onde procuramos marcações da lista (grupo + título). */
function tagText(item: MediaItem) {
  return norm(`${item.title} ${item.genres.join(" ")} ${item.category ?? ""}`);
}

export function matchesType(item: MediaItem, kind: MediaKind, tipo: string) {
  if (tipo === "Todos") return true;
  if (tipo === "Filmes") return kind === "movie";
  if (tipo === "Séries") return kind === "series";
  if (tipo === "Canais") return kind === "channel";
  const re = TAG_RE[tipo];
  return re ? re.test(tagText(item)) : true;
}

export type MediaKind = "movie" | "series" | "channel";

function matchesGenre(item: MediaItem, genero: string) {
  if (genero === "Todos") return true;
  const target = norm(genero);
  return item.genres.some((g) => {
    const value = norm(g);
    return value.includes(target) || target.includes(value);
  });
}

function matchesYear(item: MediaItem, ano: string) {
  if (ano === "Todos") return true;
  const year = item.year;
  if (!year) return false;
  if (ano === "2020-2023") return year >= 2020 && year <= 2023;
  if (ano === "Antes de 2020") return year < 2020;
  return year === Number(ano);
}

function matchesCountry(item: MediaItem, pais: string) {
  if (pais === "Todos") return true;
  const codes = COUNTRY_CODES[pais] ?? [];
  return (item.countries ?? []).some((c) => codes.includes(c.toUpperCase()));
}

function matchesAudio(item: MediaItem, audio: string) {
  if (audio === "Todos") return true;
  const value = item.audio ?? "";
  if (audio === "Legendado") return value === "Legendado";
  return value === audio;
}

function matchesRating(item: MediaItem, nota: string) {
  if (nota === "Todos") return true;
  const min = Number.parseFloat(nota);
  return item.rating >= min;
}

function matchesRuntime(item: MediaItem, duracao: string) {
  if (duracao === "Todos") return true;
  const min = item.runtimeMin ?? 0;
  if (!min) return false;
  if (duracao === "< 90 min") return min < 90;
  if (duracao === "90-120 min") return min >= 90 && min <= 120;
  if (duracao === "120-150 min") return min > 120 && min <= 150;
  return min > 150;
}

const DAY = 24 * 60 * 60 * 1000;
const WINDOWS: Record<string, number> = {
  "Última semana": 7 * DAY,
  "Último mês": 30 * DAY,
  "Último trimestre": 90 * DAY,
  "Último ano": 365 * DAY,
};

function matchesRelease(item: MediaItem, lancamento: string) {
  if (lancamento === "Todos") return true;
  const window = WINDOWS[lancamento];
  const date = item.releaseDate ? Date.parse(item.releaseDate) : NaN;
  if (Number.isNaN(date)) return false;
  return Date.now() - date <= window;
}

/** Todos os critérios são cumulativos. */
export function matchesFilters(item: MediaItem, kind: MediaKind, state: FilterState) {
  return (
    matchesType(item, kind, state.tipo) &&
    matchesGenre(item, state.genero) &&
    matchesYear(item, state.ano) &&
    matchesCountry(item, state.pais) &&
    matchesAudio(item, state.audio) &&
    matchesRating(item, state.nota) &&
    matchesRuntime(item, state.duracao) &&
    matchesRelease(item, state.lancamento)
  );
}

/** Critérios que a própria lista M3U já responde (sem precisar do TMDB). */
export const LOCAL_FILTER_KEYS: FilterKey[] = ["tipo", "genero", "ano", "audio"];
/** Critérios que só existem depois do enriquecimento TMDB. */
export const TMDB_FILTER_KEYS: FilterKey[] = ["pais", "nota", "duracao", "lancamento"];

/** Aplica só o que dá para avaliar sobre a lista inteira, sem TMDB. */
export function matchesLocalFilters(item: MediaItem, kind: MediaKind, state: FilterState) {
  return (
    matchesType(item, kind, state.tipo) &&
    matchesGenre(item, state.genero) &&
    matchesYear(item, state.ano) &&
    matchesAudio(item, state.audio)
  );
}

/** Há algum critério ativo que exige metadados do TMDB? */
export function needsTmdb(state: FilterState) {
  return TMDB_FILTER_KEYS.some((key) => state[key] !== "Todos");
}

/** Rótulos dos filtros ativos, para exibir como chips. */
export function activeFilterChips(state: FilterState) {
  return (Object.keys(state) as FilterKey[])
    .filter((key) => state[key] !== "Todos")
    .map((key) => ({
      key,
      title: FILTER_GROUPS.find((g) => g.key === key)?.title ?? key.toUpperCase(),
      value: state[key],
    }));
}


/** Aplica o filtro de TIPO em um canal ao vivo (Kids, Anime, Doc, Reality). */
export function matchesChannel(name: string, category: string, state: FilterState) {
  const tipo = state.tipo;
  if (tipo === "Todos" || tipo === "Canais") return true;
  if (tipo === "Filmes" || tipo === "Séries") return false;
  const re = TAG_RE[tipo];
  return re ? re.test(norm(`${name} ${category}`)) : true;
}

/** Detecta o áudio a partir das marcações comuns das listas IPTV. */
export function detectAudio(text: string): MediaItem["audio"] {
  const value = norm(text);
  if (/\b(leg|legendado|sub|subtitled|vose)\b/.test(value)) return "Legendado";
  if (/\b(dub|dublado|dublagem|pt-?br|portugues)\b/.test(value)) return "Português";
  if (/\b(esp|espanhol|latino|castellano)\b/.test(value)) return "Espanhol";
  if (/\b(eng|ingles|english|original)\b/.test(value)) return "Inglês";
  return undefined;
}
