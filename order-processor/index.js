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
const consumer = kafka.consumer({ groupId: 'order-processor-group' });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders', fromBeginning: false });
  console.log('order-processor listening on topic: orders');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const o = JSON.parse(message.value.toString());
      await pool.execute(
        `INSERT INTO orders (orderId, userId, productId, productName, productPrice, productBrand, productImage, quantity, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
         ON DUPLICATE KEY UPDATE status='completed'`,
        [o.orderId, o.userId, o.productId, o.productName, o.productPrice, o.productBrand, o.productImage, o.quantity, o.createdAt]
      );
      console.log(`Processed order: ${o.orderId}`);
    },
  });
}

run().catch(err => { console.error(err); process.exit(1); });
