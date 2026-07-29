import hero1 from "../assets/hero-1.jpg";
import hero2 from "../assets/hero-2.jpg";
import hero3 from "../assets/hero-3.jpg";

/**
 * Dados fictícios apenas para o protótipo visual.
 * No APK real: playlist -> dados internos -> TMDB (complemento).
 * A forma de MediaItem já espelha os campos que o TMDB fornecerá.
 */
export type MediaItem = {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  rating: number;
  genres: string[];
  overview: string;
  runtime?: string;
  seasons?: number;
  episodes?: number;
  cast?: string[];
  castList?: { name: string; character?: string; photo: string }[];
  director?: string;
  backdrop: string;
  poster: string;
  posterPosition?: string;
  /** URL do stream vinda da lista M3U/HLS (ausente nos dados de exemplo). */
  streamUrl?: string;
};

export type Channel = {
  id: string;
  name: string;
  category: string;
  now: string;
  initials: string;
};

const backdrops = [hero1, hero2, hero3];

export const featured: MediaItem[] = [
  {
    id: "f1",
    title: "Horizonte de Vega",
    originalTitle: "Vega Horizon",
    year: 2025,
    rating: 8.7,
    genres: ["Ficção Científica", "Aventura"],
    overview:
      "Uma tripulação isolada descobre um sinal vindo do outro lado da nebulosa e precisa decidir se responde — ou se foge.",
    runtime: "2h 14min",
    cast: ["Ana Duarte", "Marco Reis", "Lia Fontes"],
    director: "R. Salgado",
    backdrop: hero1,
    poster: hero1,
  },
  {
    id: "f2",
    title: "Neon Sangue Frio",
    originalTitle: "Cold Neon",
    year: 2024,
    rating: 8.1,
    genres: ["Ação", "Thriller"],
    overview:
      "Numa metrópole que nunca dorme, um detetive persegue um fantasma digital pelas ruas encharcadas de neon.",
    runtime: "1h 58min",
    cast: ["Kenji Mori", "Sofia Braga"],
    director: "T. Okada",
    backdrop: hero2,
    poster: hero2,
  },
  {
    id: "f3",
    title: "A Fenda",
    originalTitle: "The Rift",
    year: 2026,
    rating: 9.0,
    genres: ["Mistério", "Sobrenatural"],
    overview:
      "Uma luz impossível surge na floresta e muda tudo o que a cidade acreditava saber sobre o próprio passado.",
    runtime: "2h 05min",
    cast: ["Helena Vaz", "Bruno Antunes"],
    director: "M. Kovacs",
    backdrop: hero3,
    poster: hero3,
  },
];

function make(prefix: string, titles: string[], base: Partial<MediaItem>): MediaItem[] {
  return titles.map((title, i) => ({
    id: `${prefix}-${i}`,
    title,
    year: 2018 + ((i * 3) % 9),
    rating: Number((6.4 + ((i * 7) % 34) / 10).toFixed(1)),
    genres: ["Drama", "Ação", "Suspense", "Comédia", "Terror"].slice(i % 3, (i % 3) + 2),
    overview:
      "Sinopse de exemplo do protótipo. No aplicativo final este texto virá da playlist ou será complementado pelo TMDB.",
    backdrop: backdrops[i % 3],
    poster: backdrops[i % 3],
    posterPosition: `${(i * 17) % 100}% ${(i * 29) % 100}%`,
    ...base,
  }));
}

export const featuredMovies = make(
  "fm",
  [
    "Horizonte de Vega",
    "Neon Sangue Frio",
    "A Fenda",
    "Última Órbita",
    "Cinzas de Prata",
    "O Silêncio do Porto",
    "Vetor Zero",
    "Noite Carmesim",
  ],
  { runtime: "1h 52min" },
);

export const recentMovies = make(
  "rm",
  [
    "Marés de Ferro",
    "Protocolo Lúmen",
    "Estrada 9",
    "Cidade Submersa",
    "O Último Sinal",
    "Fogo Branco",
    "Setor 12",
    "Herança de Vidro",
  ],
  { runtime: "2h 03min" },
);

export const featuredSeries = make(
  "fs",
  [
    "Nebulosa",
    "Casa Vazia",
    "Linha Tênue",
    "Império de Areia",
    "Códigos",
    "A Última Fronteira",
    "Sombra Azul",
    "Reversos",
  ],
  { seasons: 3, episodes: 24 },
);

export const recentSeries = make(
  "rs",
  [
    "Contagem Regressiva",
    "Rota Norte",
    "Vertigem",
    "Os Herdeiros",
    "Ponto Cego",
    "Ruído Branco",
    "Mar de Cristal",
    "Distrito 7",
  ],
  { seasons: 2, episodes: 16 },
);

export const channels: Channel[] = [
  { id: "c1", name: "VÉXIA Cine", category: "Filmes", now: "Sessão da Noite", initials: "VC" },
  { id: "c2", name: "VÉXIA Sports", category: "Esportes", now: "Rodada ao vivo", initials: "VS" },
  { id: "c3", name: "VÉXIA News", category: "Notícias", now: "Jornal 20h", initials: "VN" },
  { id: "c4", name: "VÉXIA Kids", category: "Infantil", now: "Desenhos", initials: "VK" },
  { id: "c5", name: "VÉXIA Docs", category: "Documentário", now: "Planeta Vivo", initials: "VD" },
  { id: "c6", name: "VÉXIA Music", category: "Música", now: "Top Hits", initials: "VM" },
  { id: "c7", name: "VÉXIA Séries", category: "Séries", now: "Maratona", initials: "VE" },
  { id: "c8", name: "VÉXIA Premium", category: "Premium", now: "Estreia", initials: "VP" },
];
