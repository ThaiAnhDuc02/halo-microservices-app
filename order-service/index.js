const http = require('http');
const { Kafka } = require('kafkajs');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'admin',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME     || 'microservices',
  waitForConnections: true,
});

const kafka = new Kafka({ brokers: [(process.env.KAFKA_BROKER || 'localhost:9092')] });
const producer = kafka.producer();

async function init() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      orderId      VARCHAR(255) PRIMARY KEY,
      userId       VARCHAR(255),
      productId    VARCHAR(255),
      productName  VARCHAR(255),
      productPrice DECIMAL(10,2),
      productBrand VARCHAR(255),
      productImage TEXT,
      quantity     INT,
      status       VARCHAR(50),
      createdAt    VARCHAR(50)
    )
  `);
  await producer.connect();
  console.log('order-service ready');
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.method === 'GET' && req.url === '/orders') {
    try {
      const [rows] = await pool.execute('SELECT * FROM orders ORDER BY createdAt DESC LIMIT 50');
      res.writeHead(200);
      res.end(JSON.stringify(rows));
    } catch {
      res.writeHead(200);
      res.end(JSON.stringify([]));
    }
  } else if (req.method === 'POST' && req.url === '/orders') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const order = JSON.parse(body);
        const orderId = `order-${Date.now()}`;
        const message = {
          orderId,
          userId: order.userId,
          productId: order.productId,
          productName: order.productName || null,
          productPrice: order.productPrice || null,
          productBrand: order.productBrand || null,
          productImage: order.productImage || null,
          quantity: order.quantity,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        await producer.send({
          topic: 'orders',
          messages: [{ key: orderId, value: JSON.stringify(message) }],
        });

        res.writeHead(202);
        res.end(JSON.stringify({ success: true, orderId, status: 'pending', message: 'Order received!' }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

init().then(() => server.listen(3003, () => console.log('order-service running on port 3003')));
