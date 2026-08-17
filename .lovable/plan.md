# Plano de Redesign: PipocaFlix Minimalista de Luxo

Implementar um novo padrão visual focado em imersão, glassmorphism e tipografia premium para as Smart TVs.

## Mudanças Visuais
- **Fundo Imersivo (Hero Background):** O fundo do app passará a ser dinâmico, exibindo o backdrop do filme/série em foco nos carrosséis da Home, com transições suaves e gradientes de profundidade.
- **Glassmorphism Premium:**
    - Atualização do sistema de foco (`vexia-focus`) para incluir um "halo" de brilho branco e efeito de vidro fosco.
    - Cards com bordas ultrafinas e sombras dinâmicas.
- **Tipografia e Espaçamento:**
    - Uso de pesos de fonte `extra-bold` e `black` para títulos de seções.
    - Aumento do espaçamento entre linhas de carrossel para um visual mais limpo.

## Detalhes Técnicos
1. **Global Background State:** Criar um mecanismo em `src/lib/background-store.ts` para sincronizar a imagem de fundo entre componentes de catálogo e a rota `home.tsx`.
2. **CSS Overhaul:** 
    - Refatorar `@utility vexia-focus` em `src/styles.css`.
    - Adicionar suporte a `backdrop-filter` para os cards focados.
3. **Component Updates:**
    - `PosterCard.tsx`: Integrar o disparador de troca de fundo no evento `onFocus`.
    - `home.tsx`: Adaptar o renderizador de fundo para suportar tanto o carrossel fixo quanto o fundo dinâmico de foco.
4. **Filtro de Lançamentos:** Garantir que o catálogo continue priorizando títulos de 2026.

Este redesign transformará o PipocaFlix em uma experiência de interface comparável aos melhores serviços de streaming do mercado.
