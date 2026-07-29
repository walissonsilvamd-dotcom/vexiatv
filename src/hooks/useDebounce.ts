import { useEffect, useState } from "react";

/**
 * Atrasa a propagação de um valor até o usuário parar de digitar.
 * Evita recalcular buscas pesadas a cada tecla em listas grandes.
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (value === debounced) return;
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  return debounced;
}
