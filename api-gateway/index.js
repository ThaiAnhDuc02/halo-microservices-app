const http = require('http');

const USER_SERVICE = 'http://user-service:3001';
const PRODUCT_SERVICE = 'http://product-service:3002';
const ORDER_SERVICE = 'http://order-service:3003';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function postJSON(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    };
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  try {
    if (req.method === 'GET' && req.url === '/users') {
      const data = await fetchJSON(`${USER_SERVICE}/users`);
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } else if (req.method === 'GET' && req.url === '/products') {
      const data = await fetchJSON(`${PRODUCT_SERVICE}/products`);
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } else if (req.method === 'POST' && req.url === '/orders') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', async () => {
        const result = await postJSON(`${ORDER_SERVICE}/orders`, JSON.parse(body));
        res.writeHead(result.status);
        res.end(JSON.stringify(result.body));
      });
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
