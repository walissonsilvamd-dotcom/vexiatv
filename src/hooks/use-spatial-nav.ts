import { useEffect, type RefObject } from "react";

/**
 * Navegação espacial (D-pad / setas) geométrica para TV.
 *
 * Antes a navegação era só por "linhas" (data-nav-row), o que fazia o foco
 * pular entre cards em grades com várias linhas. Agora o alvo é escolhido
 * pela posição real na tela: o vizinho mais próximo na direção pressionada.
 *
 * Continua compatível com `data-nav-row` + `tabIndex={0}`: qualquer elemento
 * com esse atributo é focável, e a linha só é usada como desempate.
 */

const KEYS: Record<string, "up" | "down" | "left" | "right"> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  // Códigos comuns de controles Android TV / teclados de TV
  Up: "up",
  Down: "down",
  Left: "left",
  Right: "right",
};

type Dir = "up" | "down" | "left" | "right";

function center(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
}

function pickFrom(a: { x: number; y: number; top: number; bottom: number }, candidates: HTMLElement[], dir: Dir) {
  let best: HTMLElement | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of candidates) {
    const b = center(el);
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    // Deve estar realmente na direção pedida (com folga p/ arredondamento).
    const along = dir === "left" ? -dx : dir === "right" ? dx : dir === "up" ? -dy : dy;
    if (along <= 4) continue;

    const across = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);

    // Horizontal: exige alinhamento na mesma faixa (evita pular de linha).
    if (dir === "left" || dir === "right") {
      const overlap = Math.min(a.bottom, b.r.bottom) - Math.max(a.top, b.r.top);
      if (overlap <= 2) continue;
    }

    // Custo: distância na direção + penalidade forte por desvio lateral.
    const score = along + across * 3;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

function anchorOf(el: HTMLElement) {
  const c = center(el);
  return { x: c.x, y: c.y, top: c.r.top, bottom: c.r.bottom };
}

function pick(from: HTMLElement, candidates: HTMLElement[], dir: Dir) {
  return pickFrom(
    anchorOf(from),
    candidates.filter((el) => el !== from),
    dir,
  );
}

function scrollableParent(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 4) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function useSpatialNav(scopeRef?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const dir = KEYS[event.key];
      if (!dir) return;

      const active = document.activeElement as HTMLElement | null;
      // Deixa o cursor livre dentro de campos de texto (esquerda/direita).
      if (
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA") &&
        (dir === "left" || dir === "right")
      ) {
        return;
      }

      const root: ParentNode = scopeRef?.current ?? document;
      const els = Array.from(root.querySelectorAll<HTMLElement>("[data-nav-row]")).filter(
        (el) => {
          if (el.offsetParent === null || el.hasAttribute("disabled")) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        },
      );
      if (els.length === 0) return;

      event.preventDefault();

      const focus = (el?: HTMLElement) => {
        if (!el) return;
        el.focus({ preventScroll: true });
        // "nearest" mantém o foco sempre visível sem saltos bruscos.
        /* "auto" (instantâneo) evita foco fora da tela entre dois toques rápidos do controle. */
        el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
      };

      // Sem foco atual (ou foco fora do escopo): entra no primeiro elemento.
      if (!active || !els.includes(active)) {
        focus(els[0]);
        return;
      }

      const target = pick(active, els, dir);
      if (target) {
        focus(target);
        return;
      }

      // Grade virtualizada: as linhas de baixo ainda não existem no DOM.
      // Rolamos o container e tentamos de novo assim que a nova linha montar.
      if (dir === "up" || dir === "down") {
        const box = scrollableParent(active);
        if (box) {
          const step = active.getBoundingClientRect().height + 12;
          const anchor = anchorOf(active);
          const before = box.scrollTop;
          box.scrollTop += dir === "down" ? step : -step;
          if (box.scrollTop !== before) {
            const shift = box.scrollTop - before;
            const moved = {
              x: anchor.x,
              y: anchor.y - shift,
              top: anchor.top - shift,
              bottom: anchor.bottom - shift,
            };
            const retry = (attempt: number) => {
              const list = Array.from(
                (scopeRef?.current ?? document).querySelectorAll<HTMLElement>("[data-nav-row]"),
              ).filter((el) => el.offsetParent !== null);
              const t = pickFrom(moved, list, dir);
              if (t) focus(t);
              else if (attempt < 4) setTimeout(() => retry(attempt + 1), 70);
            };
            setTimeout(() => retry(0), 60);
            return;
          }
        }
      }

      // Nada exatamente na direção: tenta a linha seguinte (fallback antigo)
      // para não deixar o usuário preso na borda da grade.
      if (dir === "up" || dir === "down") {
        const row = Number(active.dataset.navRow);
        const rows = [...new Set(els.map((el) => Number(el.dataset.navRow)))].sort(
          (a, b) => a - b,
        );
        const next = rows[rows.indexOf(row) + (dir === "down" ? 1 : -1)];
        if (next === undefined) return;
        const list = els.filter((el) => Number(el.dataset.navRow) === next);
        const a = center(active);
        focus(
          list.sort((p, q) => Math.abs(center(p).x - a.x) - Math.abs(center(q).x - a.x))[0],
        );
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scopeRef]);
}
