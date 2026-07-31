## VÉXIA TV — Plano das 6 melhorias

Entrego em 3 etapas, cada uma testável no preview.

### Etapa 1 — Experiência de uso (maior impacto imediato)

**1. Busca global**
- Nova rota `/busca` + campo de busca no cabeçalho de todas as telas.
- Procura ao mesmo tempo em Filmes, Séries e Canais da lista carregada, com resultados agrupados por tipo e navegação por D-pad/teclado.
- Reaproveita o índice já existente da playlist (sem custo extra de rede).

**2. Modo offline / erro de rede**
- Tela clara quando a lista M3U não carrega: motivo, botão "Tentar novamente" e opção de usar a última lista salva em cache.
- Indicador discreto de "sem conexão" no cabeçalho.

### Etapa 2 — Conteúdo e continuidade

**3. Atualização automática da lista**
- Revalidação em segundo plano ao abrir o app (respeitando um intervalo configurável em Ajustes).
- Aviso do que mudou: "12 canais novos, 3 removidos", sem travar a navegação.

**4. EPG (guia de programação) nos canais**
- Leitura de XMLTV quando a lista fornecer a URL do guia (padrão `url-tvg`/`x-tvg-url` do M3U, ou campo manual em Listas).
- Nos cards e no player: programa atual, próximo e barra de progresso da programação.
- Se a lista não tiver EPG, tudo continua funcionando sem o guia.

### Etapa 3 — Perfis e empacotamento

**5. Perfis de usuário + controle parental**
- Seleção de perfil ao entrar (Adulto/Criança/personalizados), cada um com favoritos, histórico e "continuar assistindo" próprios.
- PIN de 4 dígitos para perfis adultos e para bloquear categorias sensíveis; PIN guardado apenas no dispositivo.

**6. APK Android TV**
- Empacotamento com Capacitor: ícone de launcher, splash nativa e banner de TV.
- Ajustes de foco D-pad, botão Voltar do controle e permissão de rede.
- Entrego o projeto Android pronto para gerar o APK; a compilação final (Android Studio / assinatura) roda fora do Lovable — te passo o passo a passo.

### Detalhes técnicos

- Busca: novo `src/lib/search-index.ts` (índice normalizado sem acentos) + `src/routes/busca.tsx`.
- Offline: estados de erro no `PlaylistProvider`, fallback pelo cache IndexedDB já existente, listener de `online/offline`.
- Auto-update: comparação de assinatura da lista e diff no `playlist-store`.
- EPG: `src/lib/epg.ts` (parser XMLTV) + cache com TTL curto; consumo em `canais.tsx` e `player.tsx`.
- Perfis: `src/lib/profiles-store.tsx`, com namespace por perfil nas chaves de favoritos/histórico/progresso.
- APK: Capacitor com `@capacitor/android`, configuração de TV (leanback) e apontamento para o build web.

Começo pela Etapa 1 assim que você aprovar.
