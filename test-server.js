const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is working!');
});

server.listen(7777, '0.0.0.0', () => {
  console.log('Test server running on http://0.0.0.0:7777');
});