const { Kafka } = require('kafkajs');
const Database = require('better-sqlite3');

const db = new Database(process.env.DB_PATH || 'orders.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    orderId TEXT PRIMARY KEY,
    userId TEXT,
    productId TEXT,
    quantity INTEGER,
    status TEXT,
    createdAt TEXT,
    processedAt TEXT
  )
`);

const insert = db.prepare(`
  INSERT OR REPLACE INTO orders (orderId, userId, productId, quantity, status, createdAt, processedAt)
  VALUES (@orderId, @userId, @productId, @quantity, @status, @createdAt, @processedAt)
`);

const kafka = new Kafka({ brokers: [(process.env.KAFKA_BROKER || 'localhost:9092')] });
const consumer = kafka.consumer({ groupId: 'order-processor-group' });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders', fromBeginning: false });

  console.log('order-processor listening on topic: orders');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const order = JSON.parse(message.value.toString());
      insert.run({ ...order, status: 'completed', processedAt: new Date().toISOString() });
      console.log(`Processed order: ${order.orderId}`);
    },
  });
}

run().catch(console.error);
