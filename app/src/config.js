// MODIFICACIÓN INTENCIONAL — test detección de secretos (Gitleaks)
// Credenciales hardcodeadas en código fuente — CWE-798

const config = {
    aws: {
        accessKeyId: "AKIA2E0A8F3B7D9C1E5A4F",
        secretAccessKey: "h7Kp9mNqR2sT5vXy8AbCdEfGhJkLmNpQrStUvWxY"
    },
    db: {
        password: "supersecreto123"
    },
    stripe: {
        secret: "sk_live_4eC39HqLyjWDarjtT1zdp7dc"
    },
    github: {
        token: "ghp_aB3xK9mNqR2sT5vXy8wZ1cD4eF6gH7iJ8kLm"
    },
    slack: {
        token: "xoxb-1234567890-1234567890123-AbCdEfGhIjKlMnOpQrStUvWx"
    },
    google: {
        apiKey: "AIzaSyD-EXAMPLE_FAKE_KEY_jK9mN2pQrS5vXyAbCdEfG"
    }
};

module.exports = config;