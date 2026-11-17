# MARCANET / IMPI — prueba técnica supervisada

**Estado: experimental, sin validación en el portal real.** Este código no constituye una conexión funcional confirmada. No se ejecuta desde el sitio web y no es el navegador de ChatGPT Work.

## Objetivo
Documentar la navegación de la búsqueda avanzada fonética del IMPI, preservando capturas y registrando exactamente dónde falla. No se descargan ni interpretan resultados automáticamente en esta versión. El sitio público de Surfing Legals no utiliza este módulo.

## Ejecución local (operador técnico)
1. Instalar Node.js 20 o superior.
2. En esta carpeta: `npm install` y `npx playwright install chromium`.
3. Ejecutar: `npm run buscar -- --clase 41 --marca "RETRO GAME FEST"`.
4. Revisar `evidencia/<fecha>/manifest.json` y capturas de pantalla.

## Criterios para considerar la búsqueda completada
- El portal confirma que los resultados terminaron de cargar.
- Se conoce y valida el número de filas, su procedencia y el momento de la consulta.
- Se descargó el PDF oficial, se conserva localmente y se vincula con la consulta.
- Se inspeccionó una muestra de filas y se verificaron correspondencias con el PDF.
- Los errores se registran diferenciando bloqueo, resultados vacíos y «Cargando».

Actualmente **ninguno de esos criterios se puede confirmar automáticamente** con este ejecutor. El código se detiene en «verificación pendiente» tras intentar la búsqueda, y no inventa resultados.

## Límites
No eludir CAPTCHAs, controles de sesión, autenticación, restricciones del portal ni límites de uso. No desplegar este proceso en Cloudflare Pages ni manejar clientes o expedientes sin revisar seguridad, privacidad, tasa de consultas y condiciones del servicio.

## Próximo desarrollo
Validar los selectores DOM con una sesión real supervisada. Solo entonces implementar lectura de tabla y descarga autenticada, con una comparación obligatoria contra los archivos oficiales. El CSV del caso RETRO GAME FEST se conserva como conjunto de regresión; no implica que el flujo del portal esté automatizado.
