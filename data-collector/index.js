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

  const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '300000'); // Mặc định 5 phút

  while (true) {
    try {
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
      console.log(`Waiting ${INTERVAL_MS / 1000} seconds before next run...`);

      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    } catch (err) {
      console.error('Error in data collection cycle:', err);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Đợi 10s nếu lỗi
    }
  }
}

run().catch(err => { 
  console.error('Fatal error:', err); 
  process.exit(1); 
});
