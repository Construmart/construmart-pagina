# Videos de Construmart (fuentes)

Cada carpeta es un video. No se publica en la página (está en .assetsignore).

- `v.html`: el video dibujado en canvas; `window.R(t)` dibuja el cuadro del segundo t.
  Arriba están `S` (escenas/tiempos) y `CAPS` (subtítulos [inicio, fin, texto]).
- `render.mjs out.mp4 T0 T1`: renderiza de T0 a T1 con Playwright + ffmpeg (30 fps).
  Las rutas dentro de los .mjs/.html apuntan a /home/claude/vidN: ajústalas a la carpeta nueva.
- `helpers.js`: subtítulos, chips, títulos y fondo compartidos.
- `voz*.mp3 / *.m4a`: voces de ElevenLabs (Antonio, voice_id htFfPSZGJwjBv1CL0aMD).
- Efectos de sonido: carpeta `sonidos/` de la CARPETA_VIDEOS_VIRALES_IA (CODE ART) del usuario.

Estado al 2026-11-25:
- alto-sin-salir-de-casa: TERMINADO (v4, 28 s).
- flojera-sin-salir-de-casa: TERMINADO (24 s).
- armex-castillo, cemento-vs-mortero, la-de-siempre-vs-construmart: borradores sin voz.
- truper-5-cosas-raras: borrador con efectos; voz ya generada en ElevenLabs (flow Ccptysk5L22XSKmKM4nt,
  generation Mf79AreyEa2zLMNpoKzM), falta descargarla, ajustar S/CAPS a la voz y renderizar.
