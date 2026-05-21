// MODIFICACIÓN INTENCIONAL — test detección de secretos (Gitleaks)
// Credenciales hardcodeadas en código fuente — CWE-798
// Patrón real: desarrollador commitea config con claves de prueba

const config = {
    aws: {
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    },
    db: {
        password: "supersecreto123"
    },
    github: {
        token: "ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    }
};

module.exports = config;