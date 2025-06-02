const http = require('http');
const express = require('express');
const app = express();

// Serve static files from the current directory
app.use(express.static(__dirname));

const port = 3000;
http.createServer(app).listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  console.log(`Access on other devices using your IP address: http://192.168.0.97:${port}/`);
}); 