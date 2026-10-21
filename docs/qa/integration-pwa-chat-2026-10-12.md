# Integración, PWA y restricciones del chat

Fecha: 2026-10-12. Proyecto Firebase exclusivo: `proyecto2responsibleai`.

## Rama revisada

`development` hasta `0d2c30f` contiene seis commits posteriores a `main` (`22e7c22`): reglas Firestore/Storage, Mi país, Globo semanal, Perfil, aportes comunitarios con imagen, revisión editorial y pruebas. La integración conserva esos commits y la rama del colaborador.

Se revisaron autenticación y permisos HTTP, separación de datos propios/públicos, aprobación editorial, rutas de imágenes, reglas Firestore/Storage, recuperación del chat, configuración y pruebas. Es una revisión de esos cambios y de la restricción del chat, no una auditoría exhaustiva del sistema.

## Problemas encontrados y corregidos

1. El chat devolvía texto libre de Gemini y dependía de instrucciones en el prompt. Ahora rechaza solicitudes de programación, tareas ajenas a noticias e intentos reconocibles de cambiar instrucciones antes de consultar el proveedor. Normaliza caracteres Unicode y excluye texto de reportes con instrucciones sospechosas.
2. La salida del modelo se limita a índices de hasta tres reportes recuperados. Se valida tipo, rango, unicidad, cantidad y claves admitidas. El servidor construye la respuesta con los extractos publicados y genera citas solo de ese contexto; nunca devuelve texto libre del modelo. Salida inválida usa una respuesta determinística con el contexto. Una selección vacía produce falta de evidencia. No hay herramientas, ejecución de código ni navegación de URLs disponibles para Gemini.
3. Un envío comunitario comprobaba existencia y luego sobrescribía el documento. La creación ahora es atómica en Firestore y en el repositorio de pruebas; un segundo envío recibe 409.
4. Las imágenes podían apuntar a otro bucket. Ahora requieren HTTPS, el bucket configurado y la ruta del usuario y envío correspondientes.
5. Las pruebas de reglas dejaban documentos incompletos en el emulador y rompían el feed del siguiente conjunto. Se limpian Firestore y Storage antes de cerrar.
6. La limpieza de emuladores buscaba procesos por nombre/proyecto. Ahora usa exclusivamente el grupo del proceso iniciado por el runner, con cierre gradual y comprobación final en macOS/Linux.
7. `FIREBASE_STORAGE_BUCKET` usa un prefijo reservado por Functions. Se reemplazó por `SUBMISSION_STORAGE_BUCKET` en backend; `VITE_FIREBASE_STORAGE_BUCKET` sigue siendo válido en frontend.
8. El paquete de despliegue incluía dependencias locales: se excluyó `node_modules`, reduciendo el archivo de Functions de 137,2 MB a unos 208 KB.

Los filtros de instrucciones son heurísticos y pueden rechazar alguna pregunta legítima. La barrera principal es la respuesta construida por el servidor con evidencia publicada, no una promesa de detección infalible. La revisión humana de los reportes sigue siendo necesaria. Las reservas del presupuesto todavía no son transaccionales y no existe una cuota por usuario para uso público masivo.

## PWA publicada

- Aplicación: https://proyecto2responsibleai.web.app
- Instalación pública: https://proyecto2responsibleai.web.app/install
- Safari iOS/iPadOS: Compartir → Añadir a pantalla de inicio → Abrir como app web si aparece → Añadir.
- Chrome Android: botón Instalar cuando esté disponible, o menú ⋮ → Añadir a pantalla de inicio → Instalar.
- Manifest con identidad estable, modo standalone, idioma español e iconos normales/maskable; metadatos Apple para la pantalla de inicio.
- Captura global del evento de instalación, sin exigir inicio de sesión; maneja cancelación y confirmación real de instalación.
- Service worker guarda la interfaz y recursos estáticos, incluidas las imágenes locales optimizadas. No guarda respuestas API ni tokens. Las rutas reservadas de Auth quedan fuera del fallback.
- Sin internet se puede abrir la interfaz y la guía. Inicio de sesión, noticias actualizadas, aportes y chat necesitan conexión.

Se desplegaron Hosting, `functions:api`, reglas e índices Firestore y reglas Storage. Bucket comunitario: `proyecto2responsibleai.firebasestorage.app`, STANDARD, US-CENTRAL1. Se habilitó la API de Storage y el rol estándar de Firestore para su agente de servicio porque las reglas verifican los documentos de los aportes. Los archivos demo existentes siguen en su bucket anterior. No se resembraron ni se cambiaron fechas de noticias de producción.

## Verificación observada

| Prueba                                                                        | Resultado                                                                                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ESLint y TypeScript backend/frontend                                          | Pasan                                                                                                                          |
| Unitarias y API backend                                                       | 95 pasan                                                                                                                       |
| Chat restringido, Unicode, inyección en fuentes y salida maliciosa del modelo | 21 casos dentro de las 95 pruebas                                                                                              |
| Frontend componentes y cliente                                                | 37 pasan                                                                                                                       |
| Navegador: navegación, Mi país, Globo, Perfil, chat y anchos 320–1920         | 4 pasan; 2 combinaciones intencionalmente omitidas                                                                             |
| Reglas Firestore/Storage y adaptador                                          | 12 pasan                                                                                                                       |
| Auth → Functions → Firestore → feed/chat en emuladores                        | 2 pasan                                                                                                                        |
| Cliente frontend → emuladores                                                 | 3 pasan                                                                                                                        |
| PWA compilada y PWA HTTPS publicada                                           | Instalabilidad Chromium sin errores; iconos/manifest correctos; apertura de /install sin conexión; API/Auth fuera de caches    |
| Gemini real con selección JSON restringida                                    | Selecciona `demo-international-weather`; 147 tokens de entrada, 11 de salida, estimación USD 0,0000716; registrada en apiUsage |

Reproducir: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:presentation`. En otras máquinas, tener Java 21+ en PATH. Para verificar Hosting: `PWA_BASE_URL=https://proyecto2responsibleai.web.app npm --prefix frontend run test:pwa`.

La prueba real de Gemini valida el contrato del proveedor, no equivale a un nuevo login Google ni a una prueba completa del endpoint autenticado desplegado. Se comprobó si el operador podía crear un token temporal de QA mediante IAM; el permiso respondió 403, no se ampliaron permisos ni se creó esa cuenta. La cadena autenticada actual se verificó en emuladores; la sesión Google de escritorio y Gemini desplegado tenían evidencia histórica del 2026-10-03.

## Falta antes de entregar la demostración

1. En un iPhone y un Android físicos: instalar desde HTTPS, iniciar sesión con Google, leer el feed, abrir/cerrar el teclado del chat y cerrar sesión. La prueba Chromium móvil usa emulación, no Safari real.
2. Crear/publicar reportes recientes con fuentes reales si se quiere poblar el Globo semanal. Los doce reportes existentes son ficticios y antiguos; la semana actual puede estar vacía legítimamente.
3. Verificar con una cuenta editorial real el envío con imagen → revisión → aprobación → aparición en feed y Globo. El flujo/API/reglas tiene pruebas automatizadas, pero no una prueba física de producción con Google y foto.
4. Completar rúbrica, documentación de Responsible AI y material de presentación. Pexels sigue siendo opcional en modo mock; no se usa para las ilustraciones demo ya guardadas.
5. Antes de una apertura al público: reservas de presupuesto transaccionales, cuotas por usuario, paginación y controles contra abuso de volumen. No son prerrequisitos para instalar la PWA ni se presentan como resueltos.

## Referencias de instalación y formato

- Apple: https://support.apple.com/guide/iphone/iphea86e5236/ios
- Chrome Android: https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid
- Gemini structured outputs: https://ai.google.dev/gemini-api/docs/structured-output
