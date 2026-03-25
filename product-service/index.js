const http = require('http');

const products = [
  { id: 1, name: 'Laptop', price: 999 },
  { id: 2, name: 'Phone', price: 499 },
];

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  if (req.url === '/products') {
    res.end(JSON.stringify(products));
  } else {
    res.end(JSON.stringify({ error: 'Not fokkund' }));
  }
});

server.listen(3002, () => console.log('product-service running on port is 3002'));
