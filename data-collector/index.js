const https = require('https');
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ brokers: [(process.env.KAFKA_BROKER || 'localhost:9092')] });
const producer = kafka.producer();

function fetchProducts() {
  return new Promise((resolve, reject) => {
    https.get('https://dummyjson.com/products?limit=30', (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data).products));
    }).on('error', reject);
  });
}

async function run() {
  await producer.connect();
  console.log('data-collector connected to Kafka');

  const products = await fetchProducts();
  console.log(`Fetched ${products.length} products from dummyjson`);

  const messages = products.map(p => ({
    key: String(p.id),
    value: JSON.stringify({
      id: String(p.id),
      name: p.title,
      price: p.price,
      brand: p.brand || null,
      category: p.category,
      image: p.thumbnail,
      rating: p.rating,
      stock: p.stock,
    }),
  }));

  await producer.send({ topic: 'external-products', messages });
  console.log(`Produced ${messages.length} messages to topic: external-products`);

  await producer.disconnect();
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
