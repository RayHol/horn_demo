const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const selfsigned = require('selfsigned');

const app = express();

// Serve static files from the current directory
app.use(express.static(__dirname));

// Generate self-signed certificate
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, {
  algorithm: 'sha256',
  days: 30,
  keySize: 2048,
});

const options = {
  key: pems.private,
  cert: pems.cert
};

const port = 3000;
https.createServer(options, app).listen(port, () => {
  console.log(`Server running at https://localhost:${port}/`);
  console.log(`Access on other devices using your IP address: https://192.168.0.97:${port}/`);
}); 