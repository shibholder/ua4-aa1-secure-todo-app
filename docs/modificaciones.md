# Lista de Alteraciones Intencionales

Este documento detalla las modificaciones introducidas deliberadamente en la aplicación durante el desarrollo de la actividad UA4_AA1, con el objetivo de provocar alertas verificables en cada una de las cinco herramientas de evaluación automática.

El enunciado de la actividad indica: *"Se motiva al grupo a que modifique o altere la aplicación, tanto como sea necesario, para hacer que las herramientas seleccionadas detecten algún tipo de problema o generen una alarma. Documentar dichas modificaciones."*

Cada modificación está registrada en un commit independiente con prefijo `vuln(` para facilitar la trazabilidad. El historial Git completo es la evidencia primaria; este documento es el resumen analítico.

---

## Tabla resumen

| # | Commit | Modificación | Herramienta objetivo | Resultado esperado |
|---|---|---|---|---|
| 1 | `b753343` | Dependencias con CVEs conocidos | Dependabot (SCA) | Alertas High en `lodash`, `axios`, `jsonwebtoken` |
| 2 | `e91071e` | Ruta `/debug` con command injection | CodeQL (SAST) | Detección de `js/command-line-injection` |
| 3 | `4568276` | Fichero `.env.example` con secretos | Gitleaks + Secret Scanning | (Fallido — no detectado por `.gitignore`) |
| 4 | `1f6a80f` | Dockerfile degradado (`node:14-alpine`) | Trivy | CVEs en capa OS + ausencia de USER |
| 5 | `9de0ee7` | Cabeceras de seguridad eliminadas | OWASP ZAP (DAST) | Alertas de cabeceras faltantes |
| 6 | `09905bd` | Mover secretos a `config.js` | Gitleaks | Detección efectiva tras corregir #3 |
| 7 | `b109708` | Cambiar claves a patrones detectables | Gitleaks + Secret Scanning | Bloqueo de push + detección post-merge |
| 8 | `1d1b9b4` | Añadir Google + SendGrid keys | Secret Scanning | Alerta adicional de Public Leak |

---

## Detalle de cada modificación

### Modificación 1 — Dependencias vulnerables (SCA)

**Commit:** `b753343` — *vuln(sca): añadir dependencias con CVEs conocidos para test Dependabot*

**Fichero modificado:** `app/package.json`

**Cambios:**

```diff
"dependencies": {
    "express": "^5.2.1",
    "mysql2": "^3.16.1",
    "sqlite3": "^5.1.7",
-   "uuid": "^13.0.0",
+   "uuid": "8.3.2",
    "wait-port": "^1.1.0",
+   "lodash": "4.17.20",
+   "axios": "0.21.0",
+   "jsonwebtoken": "8.5.1"
}
```

**Justificación técnica:**

- **`uuid` bajado a 8.3.2**: alineación con el `Dockerfile` que ya forzaba esa versión. La coherencia entre `package.json` y `Dockerfile` permite que tanto Dependabot (que lee `package.json`) como Trivy (que escanea la imagen) detecten la misma versión obsoleta.
- **`lodash@4.17.20`**: contiene CVE-2021-23337 (command injection en `_.template`). Severidad High.
- **`axios@0.21.0`**: contiene CVE-2020-28168 (SSRF) y CVE-2021-3749 (ReDoS). Severidad High.
- **`jsonwebtoken@8.5.1`**: contiene CVE-2022-23529 (verificación de firma incorrecta). Severidad High.

**Efecto observado:** Dependabot abrió **20 alertas** (16 directas + 4 transitivas), 10 de severidad High, 4 Moderate, 2 Low. Generó automáticamente 13 Pull Requests de remediación, de los cuales mergeamos uno (`#5 path-to-regexp 8.3.0 → 8.4.2`) para demostrar el ciclo completo de detección → fix → cierre.

---

### Modificación 2 — Command injection (SAST)

**Commit:** `e91071e` — *vuln(sast): añadir ruta /debug con command injection para test CodeQL*

**Ficheros modificados:**
- `app/src/routes/debug.js` (nuevo)
- `app/src/index.js` (registro de la ruta)

**Código añadido (`debug.js`):**

```javascript
const { exec } = require('child_process');

module.exports = (req, res) => {
    const cmd = req.query.cmd || 'echo hello';
    exec(cmd, (err, stdout, stderr) => {
        if (err) return res.status(500).send(stderr);
        res.send(stdout);
    });
};
```

**Justificación técnica:** patrón clásico de **CWE-78 (OS Command Injection)**. El parámetro `req.query.cmd` fluye sin validación al sink `exec()`. Permite ejecutar comandos arbitrarios en el contenedor (ej. `GET /debug?cmd=cat /etc/passwd`). CodeQL rastrea este flujo taint-source → taint-sink y lo marca como vulnerabilidad crítica.

**Efecto observado:** CodeQL detectó la vulnerabilidad como `js/command-line-injection` con severidad **Critical** en `app/src/routes/debug.js:8`.

---

### Modificación 3 — Secretos en `.env.example` (intento fallido)

**Commit:** `4568276` — *vuln(secrets): añadir .env.example con credenciales de ejemplo para test Gitleaks*

**Fichero creado:** `app/.env.example`

**Resultado:** **Gitleaks NO detectó los secretos.**

**Análisis del fallo:** el fichero `.gitignore` del proyecto incluye reglas que cubren `.env` y `.env.local`. Estas reglas hacen que Git ignore ficheros cuyo nombre contenga `.env`. Aunque `.env.example` no es el patrón exacto, Gitleaks aplica políticas conservadoras sobre ficheros con nombres "env-like" y los excluye del escaneo por considerar que normalmente contienen plantillas con valores dummy.

**Lección aprendida:** **Esto es un patrón realista de fallo en producción**. Muchos equipos creen estar protegidos por colocar secretos en ficheros `.env*` pensando que `.gitignore` los protegerá, pero olvidan que (i) ficheros como `.env.example` o `.env.template` SÍ se commitean intencionalmente y (ii) el peligro real son los secretos hardcodeados en código fuente, no en `.env`.

---

### Modificación 4 — Imagen Docker degradada (container scanning)

**Commit:** `1f6a80f` — *vuln(container): degradar imagen base a node:14-alpine y eliminar USER para test Trivy*

**Fichero modificado:** `Dockerfile`

```diff
- FROM node:18-alpine
+ FROM node:14-alpine
  WORKDIR /app
  COPY app/ ./
  RUN npm install
  RUN npm install uuid@8.3.2
+ RUN npm install lodash@4.17.20
  CMD ["node", "src/index.js"]
  EXPOSE 3000
```

**Justificación técnica:**

- **`node:18-alpine` → `node:14-alpine`**: Node 14 alcanzó End-of-Life en abril de 2023. La imagen acumula CVEs no parcheados tanto en el runtime Node como en la capa OS Alpine 3.13.
- **Sin instrucción `USER`**: el contenedor corre como `root` por defecto. Trivy lo señala con la regla `DS002 (Image user should not be 'root')`.

**Efecto observado:** Trivy detectó **131 vulnerabilidades** clasificadas como 5 Critical, 45 High, 70 Medium, 11 Low. Incluye CVEs en `openssl`, `busybox`, `form-data`, además de los CVEs de los módulos npm plantados.

**Efecto colateral documentado:** esta modificación impidió que la aplicación arrancara con Express 5 (requiere Node ≥16 por `Object.hasOwn`). Se resolvió creando un `Dockerfile.zap` paralelo con `node:18-alpine` exclusivamente para el workflow DAST. Ver §5.1 del informe principal.

---

### Modificación 5 — Cabeceras inseguras (DAST)

**Commit:** `9de0ee7` — *vuln(dast): añadir cabeceras inseguras y CORS abierto para test OWASP ZAP*

**Fichero modificado:** `app/src/index.js`

**Código añadido:**

```javascript
app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'Express');           // expone tecnología
    res.setHeader('Access-Control-Allow-Origin', '*');  // CORS abierto
    res.removeHeader('X-Frame-Options');                // permite clickjacking
    next();
});
```

**Justificación técnica:**

- **`X-Powered-By: Express`**: information disclosure. Permite a un atacante identificar la stack tecnológica y buscar CVEs específicos del framework.
- **`Access-Control-Allow-Origin: *`**: CORS abierto. Permite que cualquier origen externo invoque la API, anulando las protecciones de Same-Origin Policy del navegador.
- **`removeHeader('X-Frame-Options')`**: elimina la protección contra clickjacking. Cualquier sitio puede embeber la aplicación en un `<iframe>`.

**Efecto observado:** OWASP ZAP Baseline detectó **11 alertas WARN** (no genera FAIL en modo baseline). De ellas, 3 corresponden directamente a estas cabeceras (`10037 X-Powered-By`, `10098 Cross-Domain Misconfiguration`, `10020 Missing Anti-clickjacking Header`). Las otras 8 son consecuencia de no usar una librería como `helmet` que añade cabeceras por defecto.

---

### Modificación 6 — Secretos en código fuente (Gitleaks, corregido)

**Commit:** `09905bd` — *vuln(secrets): mover credenciales hardcodeadas a config.js (fuera del .gitignore)*

**Fichero creado:** `app/src/config.js`

**Justificación:** tras el fallo de la Modificación 3, se trasladaron los secretos a un fichero JavaScript real del proyecto. Esto es además más representativo de un fallo de seguridad real: las credenciales hardcodeadas en código fuente son uno de los patrones más comunes en filtraciones reales (cf. Top OWASP A07:2021 — Identification and Authentication Failures, y CWE-798).

---

### Modificación 7 — Patrones de secretos detectables

**Commit:** `b109708` — *vuln(secrets): cambiar a patrones de secretos detectables (fuera de allowlist por defecto)*

**Fichero modificado:** `app/src/config.js`

**Cambios:**

- Sustituidas las claves AWS de ejemplo público (`AKIAIOSFODNN7EXAMPLE`) por valores con formato válido pero **no presentes en allowlists** de proveedores.
- Añadidos secretos de proveedores reconocidos: Stripe (`sk_live_*`), Slack (`xoxb-*`), GitHub PAT (`ghp_*`).

**Resultado:** **GitHub Push Protection bloqueó el push**, alertando sobre `Stripe API Key` y `Slack API Token`. Se autorizó el bypass desde la URL generada por GitHub (justificación: "It's used in tests"). Esto generó las alertas correspondientes en Secret Scanning.

**Efecto observado:** tras el bypass, Gitleaks detectó **7 secretos** en `config.js`. La diferencia entre los detectados por Gitleaks (genéricos + específicos) y los bloqueados por Push Protection (solo proveedores reconocidos) demuestra el valor de tener ambas herramientas.

---

### Modificación 8 — Google API y SendGrid (refuerzo)

**Commit:** `1d1b9b4` — *test: añadir Google + SendGrid API keys para reproducir bloqueo*

**Fichero modificado:** `app/src/config.js`

**Justificación:** se intentó reproducir el bloqueo de Push Protection con dos claves adicionales. Esta vez **no bloqueó** porque los patrones específicos de Google y SendGrid no estaban en la lista de "patrones de proveedores asociados" en el momento del push. Sin embargo, **GitHub sí generó una alerta posterior como "Public Leak"** sobre el repositorio público, demostrando que la cobertura post-push funciona aunque el bloqueo pre-push falle.

---

## Resumen de aprendizajes

1. **El orden de las modificaciones importa**: introducir modificaciones progresivas y verificar la detección de cada herramienta es más eficaz que volcar todos los cambios en un commit masivo. Permite atribuir hallazgos a causas concretas.

2. **No todas las modificaciones funcionan a la primera**: Modificaciones 3, 6 y 7 evidencian iteración: el primer intento no fue detectado, hubo que entender el porqué y corregir. Esto refuerza la utilidad pedagógica del ejercicio.

3. **Modificaciones simples pueden disparar cascadas**: la Modificación 4 (cambiar la base Node 14) generó 131 hallazgos en Trivy sin necesidad de inventar CVEs adicionales. La cadena de suministro multiplica el impacto.

4. **Push Protection actúa como guardia preventivo real**: el bloqueo en el push del commit `b109708` no fue planeado pero sí esperado. Demuestra que el "shift-left" funciona en la práctica con configuraciones nativas de GitHub.
