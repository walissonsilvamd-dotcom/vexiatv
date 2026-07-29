## Objetivo

Criar uma splash screen em tela cheia para o "VÉXIA TV" usando a imagem enviada como fundo, com uma animação sutil de "carregando". Isso prepara terreno para depois empacotar como APK player de Smart TV.

## O que será feito

1. **Subir a imagem como asset do CDN** (`lovable-assets`) a partir de `user-uploads://Splash.jpeg`, salvando o ponteiro em `src/assets/splash.jpeg.asset.json`. Assim o binário não fica no repositório.

2. **Substituir `src/routes/index.tsx`** (a rota `/` placeholder) por uma splash screen:
   - Fundo preto com a imagem centralizada em `object-contain` (mantém proporção 16:9, ideal para TV) ocupando 100vw × 100vh.
   - A imagem já contém o logo VÉXIA TV e o texto "CARREGANDO..." — não vamos sobrepor texto novo, para não duplicar.
   - Uma leve animação de pulse/glow sutil sobre a imagem para dar sensação de "ativa" enquanto carrega (opcional, discreto).
   - Sem scroll, sem chrome, sem margens.

3. **Atualizar o `head()` da rota** com título e meta apropriados: `VÉXIA TV — Carregando`, description curta, og:title/og:description.

4. **Remover o placeholder** `data-lovable-blank-page-placeholder` da index.

## Fora do escopo (para depois)

- Empacotamento em APK Android TV.
- Tela seguinte ao carregamento (home do player, listas, player de vídeo).
- Lógica real de "carregando" ligada a boot do app.

Confirma que posso seguir assim (só a splash agora, sem texto adicional sobre a imagem)?