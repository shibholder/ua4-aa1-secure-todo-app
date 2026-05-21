const express = require('express');
const app = express();

// MODIFICACIÓN INTENCIONAL — test DAST (OWASP ZAP)
// Cabeceras inseguras: deshabilita protecciones por defecto
app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'Express');          // expone tecnología
    res.setHeader('Access-Control-Allow-Origin', '*'); // CORS abierto
    res.removeHeader('X-Frame-Options');               // permite clickjacking
    next();
});

const db = require('./persistence');
const getItems = require('./routes/getItems');
const addItem = require('./routes/addItem');
const updateItem = require('./routes/updateItem');
const deleteItem = require('./routes/deleteItem');

// MODIFICACIÓN INTENCIONAL — test SAST
const debugRoute = require('./routes/debug');
app.get('/debug', debugRoute);

app.use(express.json());
app.use(express.static(__dirname + '/static'));

app.get('/items', getItems);
app.post('/items', addItem);
app.put('/items/:id', updateItem);
app.delete('/items/:id', deleteItem);

db.init().then(() => {
    app.listen(3000, () => console.log('Listening on port 3000'));
}).catch((err) => {
    console.error(err);
    process.exit(1);
});

const gracefulShutdown = () => {
    db.teardown()
        .catch(() => {})
        .then(() => process.exit());
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Sent by nodemon
