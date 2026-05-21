# Proyecto Unificado: Web-App S-SDLC & DevSecOps

Este repositorio contiene la evolución y unificación del proyecto tipo de nuestro equipo, integrando las consideraciones de un Ciclo de Vida de Desarrollo de Software Seguro (S-SDLC) con la cultura, automatización y herramientas de DevSecOps.

## A. Miembros del Grupo y Proyectos Iniciales

En la fase previa, analizamos y discutimos las siguientes implementaciones individuales para unificar los mejores enfoques de seguridad en este proyecto final:

* **Carlos Trueba:** [https://github.com/Saiker69420/todo-app-ssdlc]
* **Jose Ruiz:** [https://github.com/CyberJARB/secure-todo-app#]
* **Jaime Vives:** [https://github.com/shibholder/mi-app-segura]

## B. Definición de la aplicación y cómo ejecutarla

**Definición:**
La aplicación es una Web-App interactiva de gestión de tareas ("To-Do list") desarrollada en Node.js. Hemos decidido unificar nuestro trabajo sobre esta base porque permite una contenerización eficiente mediante Docker. Esto nos facilita implementar *pipelines* automatizados (CI/CD) y aplicar controles de seguridad dinámicos y estáticos en contenedores, pilares fundamentales de DevSecOps.

**Cómo ejecutarla en local:**
1. Construir la imagen localmente:
   `docker build -t secure-todo-app-devsecops .`
2. Ejecutar el contenedor aislando la red al puerto específico:
   `docker run -d -p 3000:3000 --name devsecops-todo-app secure-todo-app-devsecops`
3. Acceder mediante el navegador a `http://localhost:3000`

## C. Consideraciones de seguridad durante el diseño

Tras analizar las tres aplicaciones iniciales, hemos consolidado las siguientes medidas de seguridad "Security by Design":

1.  **Gestión estricta de dependencias (SCA):** Para evitar ataques a la cadena de suministro (como vulnerabilidades en paquetes de npm), el diseño obliga a fijar versiones específicas en el `Dockerfile` (ej. `uuid@8.3.2`) e incluye el bloqueo de versiones mediante archivos `package-lock.json` o `yarn.lock`.
2.  **Minimización de la superficie de ataque (Contenedores):** Uso exclusivo de imágenes base minimalistas (`node:18-alpine`), que carecen de herramientas innecesarias y reducen drásticamente los vectores de ataque del sistema operativo.
3.  **Principio de Mínimo Privilegio (PoLP):** Configuración de la red del contenedor para exponer únicamente el puerto 3000, bloqueando por defecto cualquier otro intento de conexión interna o externa.
4.  **Modelado de Amenazas (STRIDE):** Identificación temprana de riesgos como la inyección de código (Spoofing/Tampering), mitigada mediante la validación de *inputs* en el diseño del frontend y backend de la Web-App.

## D. Implementación de la Web-App siguiendo S-SDLC y DevSecOps

Para transformar esta aplicación en un producto 100% DevSecOps, la seguridad deja de ser una fase final para integrarse como código y automatización en cada etapa del ciclo de vida. A continuación, detallamos el paso a paso de nuestra arquitectura unificada:

### 1. Planificación y Requisitos (Plan)
* **S-SDLC:** Se definen los requisitos de seguridad normativos y de negocio.
* **DevSecOps:** Se integran herramientas de modelado de amenazas as-a-code (ej. IriusRisk) y se crean historias de usuario de seguridad en el backlog (Jira/Azure Boards) junto a las tareas de desarrollo.

### 2. Desarrollo (Code)
* **S-SDLC:** Uso de guías de codificación segura (OWASP).
* **DevSecOps:** Los desarrolladores utilizan IDEs (como VS Code) con plugins de análisis en tiempo real (SonarLint). Se implementan *Pre-commit hooks* (ej. Talisman o TruffleHog) para bloquear *commits* que contengan contraseñas o *tokens* en el código fuente.

### 3. Construcción (Build / CI)
* **S-SDLC:** Revisión de código por pares (*Peer Review*).
* **DevSecOps:** Al subir el código a GitHub, se dispara una GitHub Action (Pipeline CI).
    * Se ejecuta **SAST** (Static Application Security Testing) con SonarQube para buscar vulnerabilidades en el código Node.js.
    * Se ejecuta **SCA** (Software Composition Analysis) con herramientas como Snyk o `npm audit` para bloquear la compilación si las librerías de terceros tienen CVEs críticos.

### 4. Pruebas (Test / CI)
* **S-SDLC:** Pruebas de penetración y control de calidad.
* **DevSecOps:** Se levanta la imagen Docker temporalmente en el pipeline y se ejecuta **DAST** (Dynamic Application Security Testing) automatizado con OWASP ZAP, simulando ataques a la Web-App en ejecución. Adicionalmente, se escanea la propia imagen Docker con Trivy o Clair buscando vulnerabilidades en la capa del sistema operativo (Alpine).

### 5. Despliegue (Deploy / CD)
* **S-SDLC:** Revisión final de arquitectura e infraestructuras.
* **DevSecOps:** Se escanean los scripts de despliegue (Infraestructura como Código - IaC) utilizando herramientas como Checkov. Si todo es seguro, la imagen Docker se firma criptográficamente (Notary/Cosign) para garantizar su inmutabilidad y se despliega en producción.

### 6. Operación y Monitorización (Operate & Monitor)
* **S-SDLC:** Gestión de parches y respuesta a incidentes.
* **DevSecOps:** Monitorización continua del contenedor en tiempo real usando Prometheus y Grafana. Se integra RASP (Runtime Application Self-Protection) y los *logs* de Docker se envían a un SIEM (Splunk/ELK) para detectar comportamientos anómalos al instante.

---

## Diagrama del Flujo DevSecOps

El siguiente diagrama detalla la integración de los controles de seguridad en nuestra canalización (Pipeline) de desarrollo continuo:

```mermaid
graph TD
    %% Definición de estilos
    classDef dev fill:#4CAF50,stroke:#388E3C,stroke-width:2px,color:white;
    classDef sec fill:#F44336,stroke:#D32F2F,stroke-width:2px,color:white;
    classDef ops fill:#2196F3,stroke:#1976D2,stroke-width:2px,color:white;

    %% Nodos
    A[Planificación<br/>Modelo de Amenazas]:::dev
    B[Código<br/>IDE + Pre-commit hooks]:::dev
    C[Build / CI<br/>SAST & SCA]:::sec
    D[Testing<br/>DAST & Docker Scan]:::sec
    E[Release<br/>Firma de Imágenes]:::ops
    F[Deploy / CD<br/>IaC Scan]:::ops
    G[Monitorización<br/>SIEM & RASP]:::ops

    %% Conexiones
    A -->|Requisitos| B
    B -->|Push / Commit| C
    C -->|Imagen Construida| D
    D -->|Aprobación QA| E
    E -->|Artifact Registry| F
    F -->|Producción| G
    G -.->|Feedback Continuo| A
---

# Parte 2 — Evaluación de la seguridad mediante herramientas automáticas (UA4_AA1)

Esta segunda parte del README es continuación directa de la actividad anterior y materializa el plan definido en la sección D. Donde antes describíamos qué herramientas integraríamos en cada fase del SDLC, aquí ejecutamos cinco de ellas sobre el código real, documentamos los resultados y mostramos las alteraciones que se introdujeron deliberadamente para forzar detecciones.

## E. Selección de herramientas y por qué cada una

Se han seleccionado cinco técnicas de evaluación, todas cubiertas por la Unidad 4 del temario de la asignatura y por la unidad de Seguridad de la cadena de suministro de software, y todas integradas como GitHub Actions sobre este mismo repositorio.

| # | Categoría AST (Unidad 4) | Herramienta | Sección del temario | Justificación |
|---|---|---|---|---|
| 1 | **SAST** | CodeQL | Unidad 4 §2 | Solución SAST nativa de GitHub. Detecta sinks típicos en Node.js (command injection, XSS, path traversal). |
| 2 | **SCA** | Dependabot | Cadena de suministro §3.2 | Citado **literalmente** en el temario como ejemplo de SCA en GitHub. Cubre `package.json` y `Dockerfile`. |
| 3 | **Container scanning** | Trivy | Unidad 4 §6.3 | Citado en *Salvaguardando la seguridad del contenedor*. Detecta CVEs en la capa OS Alpine y dependencias embebidas. |
| 4 | **DAST** | OWASP ZAP Baseline | Unidad 4 §3 | Herramienta DAST de referencia OWASP, citada como ejemplo de pruebas de caja negra. |
| 5 | **Gestión de secretos** | Gitleaks | AST §2.2.4 | Aplica regex sobre el historial Git completo. Equivalente funcional a TruffleHog/Talisman ya citados en este README. |
| Bonus | Push protection nativo | GitHub Secret Scanning | — | Complementa a Gitleaks bloqueando secretos **antes** del push. Activado en `Settings → Code security`. |

**Herramientas descartadas:**
- **IAST** y **RASP** (Unidad 4 §4 y §5): requieren instrumentar la aplicación. Coste/beneficio desfavorable para esta iteración. Quedan como trabajo futuro.
- **OSV-Scanner**: se solapa con Dependabot. Mencionado como trabajo futuro en el informe.

## F. Resumen de resultados

| Herramienta | Hallazgos | Severidad principal |
|---|---|---|
| CodeQL | 2 | 1 Critical, 1 High |
| Dependabot | 20 (16 open + 4 closed) | 10 High, 4 Moderate, 2 Low |
| Trivy | 132 (131 open + 1 closed) | 5 Critical, 45 High, 70 Medium, 11 Low |
| OWASP ZAP Baseline | 11 (todos WARN) | 56 reglas PASS |
| Gitleaks | 7 secretos | (no aplica severidad) |
| Secret Scanning | 3 (1 open, 2 bypassed) | Critical (Public leak) |

**El informe detallado se encuentra en [`docs/informe-seguridad.md`](docs/informe-seguridad.md).** Allí se explican los hallazgos por herramienta, las incidencias encontradas durante la integración (conflicto Trivy/ZAP por la versión de Node, bug del artifact de la action de ZAP, comportamiento de Gitleaks frente a `.gitignore` y allowlists) y un análisis comparativo cruzado entre las cinco herramientas.

## G. Alteraciones intencionales en la aplicación

El enunciado anima al grupo a *"modificar o alterar la aplicación, tanto como sea necesario, para hacer que las herramientas seleccionadas detecten algún tipo de problema o generen una alarma"*. Las modificaciones se introdujeron en commits separados con prefijo `vuln(` para facilitar la trazabilidad.

Resumen rápido:

1. **Dependencias vulnerables** (`b753343`): `lodash@4.17.20`, `axios@0.21.0`, `jsonwebtoken@8.5.1`, `uuid@8.3.2`. Para SCA.
2. **Command injection** (`e91071e`): ruta `/debug` que pasa `req.query.cmd` a `exec()`. Para SAST.
3. **Imagen Docker degradada** (`1f6a80f`): `node:14-alpine` (EOL) sin instrucción `USER`. Para container scanning.
4. **Cabeceras inseguras** (`9de0ee7`): elimina `X-Frame-Options`, añade `X-Powered-By` y `CORS: *`. Para DAST.
5. **Secretos hardcodeados** (`09905bd`, `b109708`, `1d1b9b4`): claves Stripe, Slack, GitHub PAT, Google API y SendGrid en `app/src/config.js`. Para detección de secretos.

**El detalle de cada modificación, su justificación técnica, los cambios concretos en código y el efecto observado se encuentra en [`docs/modificaciones.md`](docs/modificaciones.md).**

Incluye también iteraciones fallidas (Modificación 3 — secretos en `.env.example` que `.gitignore` ocultó a Gitleaks) y bloqueos imprevistos (Push Protection rechazando el commit `b109708`). Esto se ha mantenido en la narrativa porque demuestra el funcionamiento real de las herramientas.

## H. Estructura del repositorio (post UA4_AA1)

```
ua4-aa1-secure-todo-app/
├── .github/
│   ├── dependabot.yml              ← Configuración SCA
│   └── workflows/
│       ├── codeql.yml              ← SAST
│       ├── gitleaks.yml            ← Detección de secretos
│       ├── trivy.yml               ← Container scanning
│       └── zap.yml                 ← DAST
├── app/                            ← Código fuente (con vulnerabilidades plantadas)
├── docs/
│   ├── informe-seguridad.md        ← Informe principal de la evaluación
│   ├── modificaciones.md           ← Detalle de alteraciones intencionales
│   ├── gitleaks-findings.csv       ← Hallazgos Gitleaks (tabular)
│   ├── gitleaks-results.sarif      ← SARIF completo de Gitleaks
│   ├── owasp-zap/                  ← Reportes OWASP ZAP (HTML, JSON, MD)
│   └── capturas/                   ← Evidencias visuales por herramienta
├── Dockerfile                      ← Imagen base node:14-alpine (analizada por Trivy)
├── Dockerfile.zap                  ← Imagen base node:18-alpine (usada por ZAP, ver §5.1 del informe)
└── README.md                       ← Este documento
```

## I. Conclusiones

1. **Las 5 herramientas + el bonus de Secret Scanning cubren las cuatro categorías AST del temario** (SAST, DAST, SCA, container scanning) más la gestión de secretos.
2. **Cada herramienta detectó las vulnerabilidades plantadas para ella.** Adicionalmente, todas detectaron hallazgos no anticipados, demostrando el valor del análisis automatizado frente a una revisión manual.
3. **Las herramientas son complementarias, no sustitutivas**: el caso del sink CodeQL invisible para ZAP, o el solapamiento Trivy ↔ Gitleaks detectando los mismos secretos desde ángulos distintos, demuestra que reducir el conjunto a 2–3 deja huecos significativos.
4. **El "shift-left" funciona**: Push Protection bloqueó secretos *antes* de que entraran al repo. Dependabot abrió 13 PRs automáticos de remediación. SAST/SCA detectan en commit, no en producción.
5. **Próximos pasos sugeridos** (más allá de esta entrega):
   - Configurar `severity-threshold` para que los workflows fallen ante hallazgos Critical/High.
   - Añadir OSV-Scanner para complementar a Dependabot (cita del temario §5 Cadena de suministro).
   - Integrar Checkov para escanear los workflows YAML y los Dockerfiles como IaC.
   - Firmar la imagen con Cosign antes del despliegue (mencionado en la sección D del README original).
