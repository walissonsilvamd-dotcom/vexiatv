import { useEffect, type RefObject } from "react";

/**
 * Navegação espacial simples (D-pad / setas do teclado) para o protótipo de TV.
 * Cada elemento focável recebe data-nav-row="<n>" e tabIndex={0}.
 */
export function useSpatialNav(scopeRef?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!keys.includes(event.key)) return;

      const root: ParentNode = scopeRef?.current ?? document;
      const els = Array.from(
        root.querySelectorAll<HTMLElement>("[data-nav-row]"),
      ).filter((el) => el.offsetParent !== null);
      if (els.length === 0) return;

      const rows = new Map<number, HTMLElement[]>();
      for (const el of els) {
        const r = Number(el.dataset.navRow);
        if (!rows.has(r)) rows.set(r, []);
        rows.get(r)!.push(el);
      }
      const rowKeys = [...rows.keys()].sort((a, b) => a - b);

      const active = document.activeElement as HTMLElement | null;
      const activeRow =
        active?.dataset?.navRow != null ? Number(active.dataset.navRow) : rowKeys[0];
      const list = rows.get(activeRow) ?? [];
      const idx = active ? list.indexOf(active) : -1;

      event.preventDefault();

      const focus = (el?: HTMLElement) => {
        if (!el) return;
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      };

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const next = event.key === "ArrowLeft" ? Math.max(0, idx - 1) : Math.min(list.length - 1, idx + 1);
        focus(list[next < 0 ? 0 : next]);
        return;
      }

      const dir = event.key === "ArrowDown" ? 1 : -1;
      const pos = rowKeys.indexOf(activeRow);
      const nextRow = rowKeys[pos + dir];
      if (nextRow === undefined) return;
      const nextList = rows.get(nextRow)!;
      focus(nextList[Math.min(Math.max(idx, 0), nextList.length - 1)]);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scopeRef]);
}
