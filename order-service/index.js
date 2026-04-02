const http = require('http');
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ brokers: [(process.env.KAFKA_BROKER || 'localhost:9092')] });
const producer = kafka.producer();

async function init() {
  await producer.connect();
  console.log('order-service connected to Kafka');
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/orders') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const order = JSON.parse(body);
        const orderId = `order-${Date.now()}`;
        const message = { orderId, ...order, status: 'pending', createdAt: new Date().toISOString() };

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
