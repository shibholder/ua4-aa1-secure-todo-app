# Informe de Evaluación de Seguridad mediante Herramientas Automáticas

**Asignatura:** Metodologías de Desarrollo Seguro (Unidad 4)
**Actividad:** UA4_AA1 — Evaluar la seguridad mediante herramientas automáticas
**Equipo:** Ruiz Bautista, Trueba Rodriguez, Vives Cabrera
**Fecha:** 21 de mayo de 2026
**Repositorio:** https://github.com/shibholder/ua4-aa1-secure-todo-app

---

## 1. Resumen ejecutivo

Se han integrado **cinco herramientas automáticas** de evaluación de seguridad sobre la aplicación Web-App "Todo-app" del proyecto del equipo, cubriendo las cuatro categorías de Application Security Testing (AST) descritas en la Unidad 4 del temario más una herramienta de gestión de secretos. Todas las herramientas se ejecutan automáticamente en el pipeline CI/CD mediante GitHub Actions ante cada push a la rama `main`.

| # | Categoría (Unidad 4) | Herramienta | Hallazgos | Estado |
|---|---|---|---|---|
| 1 | SAST | CodeQL | 2 (1 Critical, 1 High) | Operativa |
| 2 | SCA | Dependabot | 16 (10 High, 4 Moderate, 2 Low) | Operativa, 1 PR mergeado |
| 3 | Container scanning | Trivy | 131 (5 Critical, 45 High, 70 Medium, 11 Low) | Operativa |
| 4 | DAST | OWASP ZAP Baseline | 11 (todos WARN, 56 PASS) | Operativa |
| 5 | Gestión de secretos | Gitleaks | 7 secretos detectados | Operativa |
| Bonus | Push protection nativo | GitHub Secret Scanning | 3 alertas (1 open, 2 closed) | Operativa |

**Total de hallazgos únicos:** 167 (Trivy domina por escanear toda la capa OS de la imagen).

Las modificaciones intencionales introducidas para forzar la detección se documentan en `modificaciones.md`. Todas las alertas listadas se corresponden con vulnerabilidades reales, ya sea introducidas deliberadamente para demostración o detectadas como efectos colaterales (p.ej. la imagen `node:14-alpine` arrastra CVEs del sistema operativo no anticipadas, válidos como hallazgos no plantados).

---

## 2. Selección de herramientas y justificación

La elección se ha guiado por tres criterios:

1. **Cobertura del temario**: cada herramienta materializa una de las categorías AST descritas en la Unidad 4 ("Pruebas de seguridad en el S-SDLC") o en la unidad de Seguridad de la cadena de suministro de software.
2. **Integración nativa con GitHub**: el enunciado de la actividad anima a usar las herramientas gratuitas de GitHub. Cuatro de las cinco se ejecutan como GitHub Actions; Dependabot es nativo de la plataforma.
3. **Coste y mantenimiento**: todas son gratuitas en repositorios públicos. Se descartaron IAST (Contrast Community Edition) y RASP (OpenRASP) por requerir instrumentación intrusiva de la aplicación con un coste/beneficio desfavorable para esta iteración.

| Herramienta | Sección del temario | Justificación específica |
|---|---|---|
| CodeQL | Unidad 4 §2 (SAST) | Es la solución SAST nativa de GitHub. Detecta sinks típicos de Node.js: command injection, path traversal, XSS reflejado y almacenado. Se ejecuta sobre el código JavaScript sin necesidad de configuración adicional. |
| Dependabot | Cadena de suministro §3.2 | Citado **literalmente** en el temario como ejemplo de SCA en GitHub: *"GitHub ofrece Dependabot, que automáticamente genera alertas cuando algún tipo de vulnerabilidad (conocida) es identificada dentro del repositorio"*. Cubre tanto `package.json` (npm) como el `Dockerfile` (Docker). |
| Trivy | Unidad 4 §6.3 (Seguridad en aplicaciones contenerizadas) | El temario lo cita expresamente en *"Salvaguardando la seguridad del contenedor → Escaneo de imágenes de contenedor"*. Detecta CVEs en la capa OS Alpine y en las dependencias node embebidas en la imagen. |
| OWASP ZAP | Unidad 4 §3 (DAST) | Herramienta DAST de referencia OWASP, citada en el material como ejemplo de pruebas de caja negra. Se ejecuta en modo "baseline" (pasivo) para no comprometer el entorno de CI. |
| Gitleaks | AST §2.2.4 (gestión de secretos) | El temario indica: *"Utiliza herramientas de gestión de secretos para almacenar de manera segura la información sensible"*. Gitleaks aplica regex sobre todo el historial Git y detecta secretos hardcodeados. Equivalente funcional a TruffleHog/Talisman ya citados en el README del proyecto inicial. |

**Herramientas descartadas y por qué:**

- **IAST (Contrast CE)**: requiere agente Java/.NET o JS específico que instrumente la aplicación. Coste de integración alto para una práctica académica.
- **RASP (OpenRASP)**: protección en runtime, no evaluación. No encaja con el objetivo de "evaluar la seguridad" del enunciado.
- **OSV-Scanner (Google)**: aunque está en el temario, su funcionalidad se solapa con Dependabot. Se menciona como trabajo futuro.

---

## 3. Resultados por herramienta

### 3.1. SAST — CodeQL

**Configuración:** workflow `.github/workflows/codeql.yml`. Análisis sobre JavaScript con la query suite por defecto (`security-extended`).

**Hallazgos:** 2 alertas abiertas.

| Severidad | Regla | Fichero | Descripción |
|---|---|---|---|
| Critical | `js/command-line-injection` | `app/src/routes/debug.js:8` | El parámetro `req.query.cmd` se pasa directamente a `exec()` sin validación. Permite ejecución arbitraria de comandos en el contenedor. CWE-78. |
| High | `js/missing-rate-limiting` | `app/src/index.js:21` | Las rutas de la API (GET/POST/PUT/DELETE /items) no aplican rate limiting, permitiendo abuso por fuerza bruta o DoS por agotamiento de recursos. CWE-770. |

**Captura:** `capturas/codeql/codeql-list.png`, `codeql-detalle-1.png`.

**Comentario técnico:** CodeQL detectó correctamente el sink de command injection introducido a propósito en el commit `e91071e` (ruta `/debug`). Es un caso de manual ideal: la query rastrea el flujo de `req.query.cmd` (taint source) hasta `exec()` (taint sink) sin sanitización intermedia, exactamente el patrón CWE-78. No se detectaron falsos positivos en este caso.

### 3.2. SCA — Dependabot

**Configuración:** `.github/dependabot.yml` con dos ecosistemas: `npm` (directorio `/app`) y `docker` (raíz). Frecuencia semanal. Security updates activadas: Dependabot abre PRs automáticos para parchear.

**Hallazgos:** 20 alertas en total (16 open, 4 closed).

| Severidad | Cantidad |
|---|---|
| Critical | 0 |
| High | 10 |
| Moderate | 4 |
| Low | 2 |

**Captura:** `capturas/dependabot/dependabot-list.png`.

**Ciclo de remediación demostrado:** se aceptó el PR automático `#5` que actualizó `path-to-regexp` de `8.3.0` a `8.4.2`, parcheando CVE-2024-52798 (ReDoS). Esto demuestra el flujo completo: detección → PR automático → revisión → merge → cierre de alerta. Ver captura `capturas/dependabot/pr-merged.png`.

**Comentario técnico:** las dependencias plantadas a propósito (`lodash@4.17.20`, `axios@0.21.0`, `jsonwebtoken@8.5.1`) fueron detectadas correctamente. Adicionalmente, Dependabot encontró vulnerabilidades transitivas no anticipadas en el árbol de dependencias (`ip-address`, `tar`, etc.), lo que demuestra el valor añadido del SCA frente a una revisión manual del `package.json` directo.

### 3.3. Container scanning — Trivy

**Configuración:** workflow `.github/workflows/trivy.yml`. Builda la imagen del `Dockerfile` (base `node:14-alpine`) y la escanea con severidades CRITICAL, HIGH y MEDIUM. Sube SARIF a Code scanning.

**Hallazgos:** 132 alertas (131 open, 1 closed).

| Severidad | Cantidad |
|---|---|
| Critical | 5 |
| High | 45 |
| Medium | 70 |
| Low | 11 |

**Captura:** `capturas/trivy/trivy-list.png`, `trivy-detalle-1.png`, `trivy-detalle-2.png`.

**Comentario técnico:** Trivy identifica CVEs en tres capas: (i) sistema operativo Alpine 3.x (paquetes `openssl`, `busybox`, etc.), (ii) runtime Node.js 14 (EOL), (iii) módulos npm instalados en la imagen. La elevada cifra de hallazgos es consecuencia directa de usar deliberadamente una imagen base EOL (`node:14-alpine`). En un proyecto real, la remediación pasaría por actualizar a `node:18-alpine` o `node:20-alpine`, lo que reduciría los hallazgos a un dígito.

**Hallazgos representativos Critical:**

| CVE / Identificador | Componente | Descripción | Origen |
|---|---|---|---|
| OpenSSL CMS RCE/DoS | `openssl` (capa OS Alpine 3.x) | Remote Code Execution o Denial of Service mediante oversized Initialization Vector en CMS parsing. Aparece en dos capas (OS y librerías del runtime Node). | No plantado (consecuencia de usar `node:14-alpine` EOL). |
| `form-data` unsafe random | Módulo npm `form-data` | Función random insegura permite predicción de boundaries en multipart requests. | No plantado (dependencia transitiva). |
| Stripe Secret Key | `app/src/config.js:13` | Secreto detectado por el módulo "secrets" de Trivy. | Plantado (commit `1d1b9b4`). |
| GitHub Personal Access Token | `app/src/config.js:16` | Token detectado por el módulo "secrets" de Trivy. | Plantado (commit `b109708`). |

**Hallazgo representativo High:**
- CVE-2021-23337 en `lodash@4.17.20` (introducido a propósito en el commit `b753343`). Command injection en `_.template`. Remediación: actualizar a `lodash@4.17.21`.

**Observación notable:** Trivy detecta secretos hardcodeados en la imagen además de CVEs. Esto solapa con Gitleaks (ver §4.2), reforzando la cobertura.

### 3.4. DAST — OWASP ZAP Baseline

**Configuración:** workflow `.github/workflows/zap.yml`. Construye una imagen alternativa (`Dockerfile.zap` con `node:18-alpine`, ver §5 *Incidencias*), levanta la aplicación, ejecuta el spider y los analizadores pasivos de ZAP, genera reportes HTML/JSON/Markdown y los sube como artifact.

**Hallazgos:** 11 alertas WARN, 56 reglas PASS, 0 FAIL.

**Categorías detectadas (resumen):**

| ID ZAP | Alerta | Origen |
|---|---|---|
| 10020 | Missing Anti-clickjacking Header (X-Frame-Options) | Plantado (commit `9de0ee7`: `res.removeHeader('X-Frame-Options')`) |
| 10021 | X-Content-Type-Options Header Missing | No plantado (la app no usa helmet) |
| 10027 | Information Disclosure - Suspicious Comments | No plantado (proviene de `react-bootstrap.js` minificada) |
| 10037 | Server Leaks Information via X-Powered-By | Plantado (commit `9de0ee7`: `res.setHeader('X-Powered-By', 'Express')`) |
| 10038 | Content Security Policy (CSP) Header Not Set | No plantado |
| 10049 | Storable and Cacheable Content | No plantado |
| 10063 | Permissions Policy Header Not Set | No plantado |
| 10098 | Cross-Domain Misconfiguration (CORS) | Plantado (commit `9de0ee7`: `Access-Control-Allow-Origin: *`) |
| 10109 | Modern Web Application | Informativo |
| 90003 | Sub Resource Integrity Attribute Missing | No plantado |
| 90004 | Cross-Origin-Embedder-Policy Header Missing | No plantado |

**Captura:** `capturas/owasp-zap/zap-summary.png`, `owasp-zap-detalle-1.png`, `owasp-zap-detalle-2.png`. Reporte completo en `docs/owasp-zap/report.html`.

**Comentario técnico:** ZAP confirmó las cabeceras inseguras plantadas en el commit `9de0ee7` (3 detecciones esperadas) y detectó 8 hallazgos adicionales no anticipados que evidencian la ausencia de una librería como `helmet` en la aplicación base. La cobertura es la propia del modo "baseline" (escaneo pasivo, sin pruebas activas de inyección).

### 3.5. Gestión de secretos — Gitleaks

**Configuración:** workflow `.github/workflows/gitleaks.yml`. Instala el binario Gitleaks v8.21.2 y escanea todo el historial Git (`--source .`). Sube SARIF como artifact.

**Hallazgos:** 7 secretos detectados.

| Regla | Fichero | Línea |
|---|---|---|
| generic-api-key | `app/src/config.js` | 6 |
| generic-api-key | `app/src/config.js` | 7 |
| stripe-access-token | `app/src/config.js` | 13 |
| github-pat | `app/src/config.js` | 16 |
| slack-bot-token | `app/src/config.js` | 19 |
| gcp-api-key | `app/src/config.js` | 22 |
| generic-api-key | `app/src/config.js` | 25 |

**Captura:** ver `docs/gitleaks-findings.csv` y `docs/gitleaks-results.sarif`.

**Comentario técnico:** Gitleaks detectó los 7 patrones de secretos plantados intencionalmente. Se evidenciaron dos comportamientos relevantes durante el desarrollo:

1. **Allowlist de Gitleaks**: las primeras pruebas con las claves de ejemplo públicas de AWS (`AKIAIOSFODNN7EXAMPLE`) no fueron detectadas porque están en la lista permitida por defecto del escáner. Sustituirlas por valores con el mismo formato pero no listados disparó la detección.
2. **Conflicto con `.gitignore`**: el primer intento de plantar secretos en `app/.env.example` no fue detectado porque `.env*` está incluido en `.gitignore` y Gitleaks respeta ese fichero. El segundo intento, en `app/src/config.js`, sí funcionó por estar fuera del `.gitignore`. **Esto refleja un patrón realista**: en producción, los secretos más peligrosos no son los que están en ficheros `.env` (a menudo ignorados) sino los hardcodeados directamente en código fuente.

### 3.6. Bonus — GitHub Secret Scanning (Push Protection)

**Configuración:** activado en `Settings → Code security → Secret scanning + Push protection`.

**Hallazgos:** 3 alertas (1 open, 2 closed/bypassed).

**Comportamiento observado:** GitHub bloqueó el `git push` cuando intentamos subir los secretos `stripe-access-token` y `slack-bot-token` con `Push Protection`. Tuvimos que autorizar manualmente el bypass con la justificación *"It's used in tests"* desde la URL que GitHub generó automáticamente.

**Captura:** `capturas/secret-scanning-list.png`.

**Comentario técnico:** Push Protection actúa **antes** de que el secreto llegue al repositorio, mientras que Gitleaks lo detecta **después** del push (ya en el historial). Ambos son complementarios. Sin embargo, Push Protection solo detecta patrones de "proveedores asociados" (Stripe, Slack, AWS reales) y deja pasar otros (Google API key, SendGrid en nuestras pruebas iniciales), mientras que Gitleaks aplica regex genérico más amplio.

---

## 4. Comparativa cruzada y análisis

### 4.1. Cobertura por superficie atacada

| Superficie | Herramienta principal | Herramienta complementaria |
|---|---|---|
| Código fuente — bugs lógicos | CodeQL (SAST) | — |
| Dependencias npm | Dependabot (SCA) | Trivy (en la imagen) |
| Imagen contenedor (OS + binarios) | Trivy | — |
| Aplicación en ejecución | OWASP ZAP (DAST) | — |
| Secretos en código fuente | Gitleaks | GitHub Secret Scanning |

### 4.2. Solapamientos y refuerzos detectados

- **Trivy ↔ Dependabot**: ambos detectan `lodash@4.17.20`. Trivy lo ve en el filesystem de la imagen; Dependabot en `package.json`. **Solapamiento útil**: si una de las dos fallara, la otra capturaría el problema.
- **Gitleaks ↔ Secret Scanning ↔ Trivy**: los tres detectan los secretos hardcodeados en `config.js` desde ángulos distintos. Gitleaks escanea el repositorio Git, Secret Scanning actúa pre-push como guardia, y Trivy los encuentra dentro de la imagen Docker construida. **Defense in depth real**.
- **CodeQL ↔ ZAP**: el sink de command injection en `/debug` lo detectó CodeQL estáticamente. ZAP no lo activó porque la ruta no fue spidereada (no hay enlaces hacia ella en el front). Esto **demuestra el complemento SAST/DAST**: una sola técnica deja huecos.

### 4.3. Tasa de falsos positivos observada

- **CodeQL**: 0 falsos positivos en los 2 hallazgos.
- **Dependabot**: 0 falsos positivos (todas las CVEs reportadas son reales).
- **Trivy**: 0 falsos positivos sobre la imagen base. Algunos hallazgos en módulos npm requieren contexto (no todos los paths de explotación son alcanzables desde la app), pero son "verdaderos positivos no críticos".
- **OWASP ZAP**: 1 hallazgo cuestionable (`10027 Information Disclosure - Suspicious Comments`) sobre `react-bootstrap.js` minificado. Es un falso positivo técnico (los "comentarios" son artefactos del bundler).
- **Gitleaks**: 0 falsos positivos en los 7 hallazgos.

---

## 5. Incidencias durante la implementación

### 5.1. Conflicto Trivy ↔ ZAP (Node 14 vs Express 5)

La degradación de la imagen base a `node:14-alpine` (necesaria para que Trivy reportara CVEs del SO antiguos) provocó que Express 5 no arrancara, porque requiere `Object.hasOwn` introducido en Node 16. ZAP recibía `Connection refused` al intentar escanear `localhost:3000`.

**Solución adoptada:** mantener dos Dockerfiles. El `Dockerfile` principal (Node 14) es el analizado por Trivy. Un `Dockerfile.zap` paralelo (Node 18) es el usado por el workflow de DAST. Demuestra que SAST/SCA y DAST cubren superficies distintas y a veces requieren entornos distintos. Documentado en commit `d398e88`.

### 5.2. Bug del artifact en `zaproxy/action-baseline@v0.12.0`

La action oficial fallaba al subir el artifact por un bug conocido con la API actual de GitHub Artifacts (`Status Code: 400 Bad Request, artifact name not valid`). Se sustituyó por una invocación directa a `docker run ghcr.io/zaproxy/zaproxy:stable` combinada con `actions/upload-artifact@v4`.

### 5.3. Permisos del volumen Docker para ZAP

Tras solucionar 5.2, los reportes de ZAP no aparecían en la carpeta montada por un problema de permisos: ZAP escribía como root dentro del contenedor pero el host no podía leerlos como `runner`. Se añadió un step de post-procesamiento con `sudo chown` para ajustar la propiedad antes del upload.

### 5.4. Gitleaks vs `.gitignore` y allowlist de proveedores

Documentado en §3.5. Las primeras iteraciones con `.env.example` y claves AWS de ejemplo no detectaron nada por dos razones combinadas. Se resolvió moviendo los secretos a `config.js` y usando patrones fuera de la allowlist por defecto.

---

## 6. Conclusiones

1. **Las 5 herramientas seleccionadas cubren las cuatro categorías AST del temario** (SAST, DAST, SCA, container scanning) más la gestión de secretos. La selección es coherente con el material teórico y con las prácticas recomendadas por DevSecOps.

2. **Cada herramienta detectó las vulnerabilidades plantadas para ella**, validando la hipótesis del enunciado. Adicionalmente, todas detectaron hallazgos no anticipados, lo que demuestra el valor del análisis automatizado frente a una revisión humana del código.

3. **El "shift-left" funciona**: los problemas se detectan en commit/build, no en producción. Push Protection bloqueó secretos *antes* de que entraran al repo; SAST/SCA bloquearían PRs en una configuración más estricta (`severity: high → fail`).

4. **Las herramientas son complementarias, no sustitutivas**: el caso del sink CodeQL detectado pero invisible para ZAP, o el de Gitleaks detectando lo que `.gitignore` ocultaba a otras herramientas, demuestra que reducir el conjunto a 2–3 deja huecos significativos.

5. **Limitaciones reconocidas**:
   - El análisis ZAP es solo "baseline" (pasivo). Un análisis "full" o autenticado descubriría inyecciones SQL/XSS en los endpoints CRUD.
   - No se han integrado IAST ni RASP (Unidad 4 §4 y §5) por coste/beneficio. Quedan como trabajo futuro.
   - Trivy no se ejecuta sobre la imagen "real" de producción porque mantenemos dos Dockerfiles. En un caso real solo habría uno y los hallazgos OS estarían tasados por la versión final.

6. **Próximos pasos sugeridos** (si se continuara):
   - Configurar `severity-threshold` en los workflows para que fallen ante hallazgos Critical/High.
   - Añadir OSV-Scanner para complementar a Dependabot (cita del temario §5 Cadena de suministro).
   - Integrar Checkov para escanear los workflows YAML y el Dockerfile como IaC.
   - Firmar la imagen con Cosign antes del despliegue (línea ya mencionada en el README del proyecto).

---

## 7. Anexos

- `docs/modificaciones.md` — lista detallada de alteraciones intencionales con su commit asociado.
- `docs/owasp-zap/report.html` — informe completo HTML de OWASP ZAP.
- `docs/owasp-zap/report.json` — informe estructurado JSON de OWASP ZAP.
- `docs/owasp-zap/report.md` — informe Markdown de OWASP ZAP.
- `docs/gitleaks-results.sarif` — SARIF completo de Gitleaks.
- `docs/gitleaks-findings.csv` — extracto tabular de hallazgos Gitleaks.
- `docs/capturas/` — evidencias visuales de todas las herramientas.