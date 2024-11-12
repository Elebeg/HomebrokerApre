const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 4000;

app.use(express.static(path.join(__dirname, 'public')));


app.use('/api', (req, res, next) => {
    console.log(`Requisição para: ${req.url}`); 
    next();
});


app.use('/api', createProxyMiddleware({
    target: 'https://api.hgbrasil.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', 
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log('Requisição Proxy:', proxyReq.path); 
    },
    onError: (err, req, res) => {
        console.error('Erro no proxy:', err); 
        res.status(500).send('Proxy Error');
    }
}));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
