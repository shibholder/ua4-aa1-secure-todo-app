// MODIFICACIÓN INTENCIONAL — test SAST (CodeQL)
// Vulnerable a command injection: req.query.cmd se pasa sin sanitizar a exec()
// CVE relacionado: CWE-78 (OS Command Injection)
const { exec } = require('child_process');

module.exports = (req, res) => {
    const cmd = req.query.cmd || 'echo hello';
    exec(cmd, (err, stdout, stderr) => {
        if (err) return res.status(500).send(stderr);
        res.send(stdout);
    });
};