import { create } from 'zustand';

interface BackgroundState {
  currentBackdrop: string | null;
  currentTitle: string | null;
  currentYear: number | null;
  currentGenres: string[];
  setBackdrop: (image: string | null, title?: string | null, year?: number | null, genres?: string[]) => void;
  reset: () => void;
}

export const useBackgroundStore = create<BackgroundState>((set) => ({
  currentBackdrop: null,
  currentTitle: null,
  currentYear: null,
  currentGenres: [],
  setBackdrop: (image, title = null, year = null, genres = []) => 
    set({ 
      currentBackdrop: image, 
      currentTitle: title, 
      currentYear: year, 
      currentGenres: genres 
    }),
  reset: () => set({ 
    currentBackdrop: null, 
    currentTitle: null, 
    currentYear: null, 
    currentGenres: [] 
  }),
}));
