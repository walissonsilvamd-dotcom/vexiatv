import type { ReactNode } from "react";
import { VirtuosoGrid, Virtuoso } from "react-virtuoso";

/**
 * Grade virtualizada: renderiza apenas os cards visíveis (+ margem),
 * mantendo o mesmo visual das grades originais em CSS grid.
 *
 * O layout de colunas continua vindo do Tailwind via `gridClassName`,
 * então cores, tamanhos e animações dos cards não mudam.
 */
export function VirtualizedGrid<T>({
  items,
  renderItem,
  keyFor,
  gridClassName,
  height = "72vh",
  overscan = 800,
}: {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyFor: (item: T, index: number) => string;
  gridClassName: string;
  height?: number | string;
  overscan?: number;
}) {
  return (
    <VirtuosoGrid
      style={{ height }}
      data={items as T[]}
      overscan={overscan}
      className="no-scrollbar"
      listClassName={gridClassName}
      computeItemKey={(index) => keyFor(items[index], index)}
      itemContent={(index) => renderItem(items[index], index)}
    />
  );
}

/** Lista vertical virtualizada (usada nos canais). */
export function VirtualizedList<T>({
  items,
  renderItem,
  keyFor,
  height = "72vh",
  overscan = 600,
  className,
}: {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyFor: (item: T, index: number) => string;
  height?: number | string;
  overscan?: number;
  className?: string;
}) {
  return (
    <Virtuoso
      style={{ height }}
      data={items as T[]}
      overscan={overscan}
      className={className}
      computeItemKey={(index) => keyFor(items[index], index)}
      itemContent={(index) => renderItem(items[index], index)}
    />
  );
}
