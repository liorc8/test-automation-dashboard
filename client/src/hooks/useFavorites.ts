import { useState } from 'react';

const STORAGE_KEY = 'favoritedAreas';

function loadFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveToStorage(favorites: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(favorites)));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFromStorage());

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveToStorage(next);
      return next;
    });
  };

  const isFavorite = (id: string): boolean => favorites.has(id);

  return { favorites, toggleFavorite, isFavorite };
}
