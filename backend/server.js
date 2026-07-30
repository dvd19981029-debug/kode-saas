const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const apiRouter = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api', apiRouter);

// Fallback to index.html for SPA router
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Servidor KODE SaaS corriendo en http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});
