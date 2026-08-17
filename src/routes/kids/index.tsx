import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSpatialNav } from "../../hooks/use-spatial-nav";
import { usePlaylist } from "../../lib/playlist-store";
import { VexiaLogo } from "../../components/vexia/VexiaLogo";
import { TopNav } from "../../components/vexia/TopNav";
import { BRAND } from "../../lib/brand";
import { isAdultText } from "../../lib/parental";
import type { MediaItem } from "../../data/vexia";

export const Route = createFileRoute("/kids/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Kids` },
      { name: "description", content: "Área infantil do PipocaFlix." },
    ],
  }),
  component: KidsPage,
});

type Category = {
  id: string;
  label: string;
  keywords: string[];
  imageType: "movie" | "series";
};

const CATEGORIES: Category[] = [
  { 
    id: "animacao", 
    label: "ANIMAÇÃO", 
    keywords: ["animação", "animation", "desenho", "cartoon", "disney", "pixar", "dreamworks"],
    imageType: "movie"
  },
  { 
    id: "infantil", 
    label: "INFANTIL", 
    keywords: ["infantil", "kids", "crianças", "children", "junior", "baby", "peppa", "galinha pintadinha", "patrulha canina"],
    imageType: "movie"
  },
  { 
    id: "animes", 
    label: "ANIMES", 
    keywords: ["anime", "otaku", "manga", "japão", "naruto", "dragon ball", "one piece", "boruto", "bleach"],
    imageType: "series"
  },
];

function KidsPage() {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  useSpatialNav(pageRef);
  const { movies, series } = usePlaylist();
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Filtra conteúdos para cada categoria para usar como fundo dinâmico
  const categoryData = useMemo(() => {
    return CATEGORIES.map(cat => {
      const all = cat.imageType === "movie" ? movies : series;
      const filtered = all.filter(item => {
        const text = `${item.title} ${item.category} ${item.genres?.join(" ") || ""}`.toLowerCase();
        const matchesKeyword = cat.keywords.some(k => text.includes(k.toLowerCase()));
        const notAdult = !isAdultText(item.title, item.category, ...(item.genres || []));
        return matchesKeyword && notAdult && item.poster;
      });
      
      // Garante imagens temáticas mesmo que a lista esteja vazia ou mal filtrada
      const fallbackImages = {
        animacao: [
          "https://image.tmdb.org/t/p/w500/uXDfjJbdG4uzjBchvdlCLQkyjYz.jpg", // Toy Story
          "https://image.tmdb.org/t/p/w500/i9KR3P4G2Jpw9kO87O1Q4u1H1T6.jpg", // Finding Nemo
          "https://image.tmdb.org/t/p/w500/k1272Lk8o6n92sXUik6y97T96Jh.jpg", // Lion King
        ],
        infantil: [
          "https://image.tmdb.org/t/p/w500/2L4dKk3lCjDqG7Fp12z1Q3H2lYj.jpg", // Frozen
          "https://image.tmdb.org/t/p/w500/sh7RGd2uYy8aocVsB3JSiAjaJLp.jpg", // Paw Patrol
          "https://image.tmdb.org/t/p/w500/r1qC0O9lE3L0Q9E1P1Z1Q2J3lYk.jpg", // Bluey
        ],
        animes: [
          "https://image.tmdb.org/t/p/w500/xpp4TqW81j1b9Gv9sH1Q3L1k1a.jpg", // Naruto
          "https://image.tmdb.org/t/p/w500/w8L0Q9E1P1Z1Q2J3lYk1qC0O9lE3.jpg", // Dragon Ball
          "https://image.tmdb.org/t/p/w500/i9KR3P4G2Jpw9kO87O1Q4u1H1T6.jpg", // One Piece
        ]
      };

      const finalImages = filtered.length > 0 
        ? [...filtered].sort(() => Math.random() - 0.5).slice(0, 10).map(i => i.poster)
        : fallbackImages[cat.id as keyof typeof fallbackImages] || [];

      return {
        ...cat,
        images: finalImages
      };
    });
  }, [movies, series]);

  return (
    <div ref={pageRef} className="relative h-screen w-full overflow-hidden bg-black text-white">
      {/* Menu Superior e Logo */}
      <div className="absolute top-8 left-0 right-0 z-50 flex items-center gap-8 px-12">
        <VexiaLogo className="h-20 w-auto drop-shadow-[0_0_20px_rgba(123,43,190,0.6)]" />
        <TopNav active="Kids" />
      </div>

      {/* Grid de botões gigantes */}
      <div className="flex h-full w-full">
        {categoryData.map((cat, i) => (
          <KidsButton 
            key={cat.id}
            category={cat}
            isFocused={focusedIndex === i}
            onFocus={() => setFocusedIndex(i)}
            onClick={() => {
              const to = cat.imageType === "movie" ? "/filmes" : "/series";
              navigate({ to, search: { q: cat.label.toLowerCase() } });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function KidsButton({ 
  category, 
  isFocused, 
  onFocus, 
  onClick 
}: { 
  category: Category & { images: (string | undefined)[] }, 
  isFocused: boolean, 
  onFocus: () => void,
  onClick: () => void
}) {
  const [currentImg, setCurrentImg] = useState(0);

  useEffect(() => {
    if (category.images.length < 2) return;
    const id = setInterval(() => {
      setCurrentImg(prev => (prev + 1) % category.images.length);
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(id);
  }, [category.images]);

  return (
    <button
      onFocus={onFocus}
      onMouseEnter={onFocus}
      onClick={onClick}
      className={`relative flex h-full flex-1 items-center justify-center overflow-hidden transition-all duration-500 ease-out outline-none ${
        isFocused ? "z-10 scale-[1.02] shadow-[0_0_50px_rgba(123,43,190,0.4)]" : "z-0 opacity-80"
      }`}
    >
      {/* Imagens de fundo passando */}
      {category.images.map((img, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
            idx === currentImg ? "opacity-40" : "opacity-0"
          }`}
        >
          {img && (
            <img 
              src={img} 
              alt="" 
              className="h-full w-full object-cover grayscale-[0.5] contrast-[1.2]" 
            />
          )}
        </div>
      ))}

      {/* Overlay gradiente */}
      <div className={`absolute inset-0 transition-colors duration-500 ${
        isFocused ? "bg-vexia-purple/20" : "bg-black/40"
      }`} />

      {/* Borda Neon no Foco */}
      {isFocused && (
        <div className="absolute inset-0 border-[6px] border-vexia-purple animate-pulse shadow-[inset_0_0_30px_rgba(123,43,190,0.6)]" />
      )}

      {/* Texto Centralizado */}
      <div className="relative z-20 text-center">
        <h2 className={`text-[4vw] font-black italic tracking-tighter transition-all duration-500 ${
          isFocused ? "scale-110 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" : "text-white/60"
        }`}>
          {category.label}
        </h2>
        {isFocused && (
          <div className="mt-4 inline-block rounded-full bg-white px-8 py-2 text-sm font-black tracking-widest text-black animate-bounce">
            ENTRAR
          </div>
        )}
      </div>
    </button>
  );
}
