import {
  channels,
  featuredMovies,
  featuredSeries,
  recentMovies,
  recentSeries,
  featured,
  type Channel,
  type MediaItem,
} from "./vexia";

export const allMovies: MediaItem[] = [...featuredMovies, ...recentMovies];
export const allSeries: MediaItem[] = [...featuredSeries, ...recentSeries];
export const allMedia: MediaItem[] = [...allMovies, ...allSeries, ...featured];

export function findMedia(id: string): MediaItem | undefined {
  return allMedia.find((m) => m.id === id);
}

export const movieCategories = [
  "Todos",
  "Lançamentos",
  "Mais Assistidos",
  "4K",
  "Ação",
] as const;

export const seriesCategories = [
  "Todos",
  "Apple TV+",
  "Amazon Prime",
  "AMC+",
  "Brasil Paralelo",
] as const;

export const channelCategories = [
  "Todos",
  "Filmes",
  "Esportes",
  "Notícias",
  "Infantil",
  "Documentário",
  "Música",
  "Séries",
  "Premium",
];

export type ChannelFull = Channel & { group: string; schedule: string };

export const fullChannels: ChannelFull[] = channels.map((c, i) => ({
  ...c,
  group: `${c.category} • HD`,
  schedule: `${String(18 + (i % 5)).padStart(2, "0")}:00 - ${String(19 + (i % 5)).padStart(2, "0")}:30`,
}));

export type ContinueItem = { item: MediaItem; progress: number };

export const continueWatching: ContinueItem[] = [
  { item: allMovies[0], progress: 62 },
  { item: allSeries[1], progress: 34 },
  { item: allMovies[4], progress: 88 },
  { item: allSeries[5], progress: 12 },
  { item: allMovies[7], progress: 45 },
];

export const seriesProgress: Record<string, number> = {
  [allSeries[0].id]: 40,
  [allSeries[1].id]: 34,
  [allSeries[3].id]: 75,
  [allSeries[5].id]: 12,
};

export type Episode = {
  id: string;
  number: number;
  title: string;
  overview: string;
  runtime: string;
  rating: number;
  thumb: string;
};

export type Season = { number: number; episodes: Episode[] };

export function seasonsFor(serie: MediaItem): Season[] {
  const total = serie.seasons ?? 2;
  return Array.from({ length: total }, (_, s) => ({
    number: s + 1,
    episodes: Array.from({ length: 6 }, (_, e) => ({
      id: `${serie.id}-s${s + 1}-e${e + 1}`,
      number: e + 1,
      title: `Episódio ${e + 1} — ${["O Sinal", "Fronteira", "Eco", "Vazio", "Ruído", "Retorno"][e]}`,
      overview:
        "Sinopse de exemplo do episódio. No aplicativo final este texto virá da playlist ou do TMDB.",
      runtime: `${42 + ((e * 7) % 15)} min`,
      rating: Number((7 + ((e + s) % 3) * 0.6).toFixed(1)),
      thumb: serie.backdrop,
    })),
  }));
}

export const filterGroups: { title: string; options: string[] }[] = [
  {
    title: "TIPO",
    options: ["Todos", "Filmes", "Séries", "Kids", "Anime", "Documentários", "Reality", "Talk Show"],
  },
  {
    title: "GÊNERO",
    options: [
      "Todos",
      "Ação",
      "Drama",
      "Comédia",
      "Terror",
      "Ficção",
      "Animação",
      "Documentário",
      "Musical",
      "Romance",
      "Suspense",
      "Faroeste",
      "Guerra",
      "Esporte",
    ],
  },
  {
    title: "ANO",
    options: [
      "Todos",
      "2026",
      "2025",
      "2024",
      "2023",
      "2022",
      "2021",
      "2020",
      "2019",
      "2018",
      "2017",
      "2016",
      "2015",
      "2010-2015",
      "Antes de 2010",
    ],
  },
  {
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
    title: "ÁUDIO",
    options: [
      "Todos",
      "Português",
      "Inglês",
      "Espanhol",
      "Francês",
      "Alemão",
      "Italiano",
      "Japonês",
      "Coreano",
      "Legendado",
    ],
  },
  {
    title: "CLASSIFICAÇÃO",
    options: ["Todos", "9.0+", "8.0+", "7.0+", "6.0+", "5.0+", "4.0+", "3.0+", "2.0+", "1.0+"],
  },
  {
    title: "DURAÇÃO",
    options: ["Todos", "< 90 min", "90-120 min", "120-150 min", "> 150 min"],
  },
  {
    title: "LANÇAMENTO",
    options: ["Todos", "Última semana", "Último mês", "Último trimestre", "Último ano"],
  },
  {
    title: "EMISSORA/STREAMING",
    options: [
      "Todos",
      "Netflix",
      "Amazon Prime",
      "HBO Max",
      "Disney+",
      "Apple TV+",
      "Star+",
      "Paramount+",
      "MUBI",
      "Globoplay",
      "Canal Brasil",
    ],
  },
  {
    title: "CLASSIFICAÇÃO ETÁRIA",
    options: ["Todos", "Livre", "10+", "12+", "14+", "16+", "18+"],
  },
];

export const DEVICE_MAC = "A4:2B:8C:1F:07:D9";
export const DEVICE_KEY = "VX-9F2K-7T4P-1MQZ";
export const SLOGAN = "POR VC... NÃO! ...PRA VC!";
