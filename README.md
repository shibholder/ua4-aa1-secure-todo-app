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