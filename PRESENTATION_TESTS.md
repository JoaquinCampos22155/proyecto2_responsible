# Pruebas para presentación

Desde la raíz del proyecto, ejecuta una vez:

```powershell
npm install
npm --prefix frontend install
npm --prefix frontend run test:e2e:install
```

Antes de presentar, la corrida completa es:

```powershell
npm run test:presentation
```

La suite reúne lint y TypeScript, pruebas de dominio/API/servicios, pruebas de componentes y flujos React, pruebas de navegador Chromium a 390 × 844 y 1440 × 900, más una matriz de overflow entre 320 y 1920 px, build de producción y una corrida integrada con Auth, Functions, Firestore y Storage Emulators. Dentro del emulador también atraviesa cliente frontend → Auth → Functions → Firestore, incluyendo sesión de lectura, chat mock y flujo editorial completo. En navegador recorre Noticias, Mi país, Globo y la semana de un país con noticias, Perfil/publicación, y el chat móvil con lectura paralela, escritura y respuesta.

Las pruebas que escriben datos usan únicamente el proyecto emulado `demo-project2-responsible`. El archivo local ignorado `.secret.local` contiene un valor ficticio para que Functions Emulator no intente consultar Secret Manager. El navegador de pruebas bloquea solicitudes HTTPS externas y usa una instancia Vite aislada en el puerto 5174; no se conecta a Firebase de producción ni a proveedores de IA o imágenes. La conversación de prueba registra costo cero.

Requisitos: Node.js 22 o posterior, Java 21 o posterior, Firebase CLI y dependencias npm instaladas. El primer `test:e2e:install` descarga Chromium; no hace falta repetirlo salvo que Playwright cambie de versión.

La prueba móvil emula viewport y touch en Chromium; no sustituye una revisión en iPhone Safari. Además, las pantallas `/preview/*` usan datos de muestra locales: una suite verde valida el diseño de demostración y los contratos del backend, pero no significa que Firebase real esté conectado. Antes del lanzamiento debe resolverse también el requisito acordado de lectura pública: actualmente las rutas reales de la app y los endpoints `/v1/*` exigen autenticación.
