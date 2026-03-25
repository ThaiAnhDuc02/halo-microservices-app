const http = require('http');

const USER_SERVICE = 'http://user-service:3001';
const PRODUCT_SERVICE = 'http://product-service:3002';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (req.url === '/users') {
      const data = await fetchJSON(`${USER_SERVICE}/users`);
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } else if (req.url === '/products') {
      const data = await fetchJSON(`${PRODUCT_SERVICE}/products`);
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  } catch (err) {
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'Service unavailable' }));
  }
});

server.listen(3000, () => console.log('api-gateway running on port 3000'));
