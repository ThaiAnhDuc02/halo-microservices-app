const { Kafka } = require('kafkajs');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'admin',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME     || 'microservices',
  waitForConnections: true,
});

async function initDB() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      orderId     VARCHAR(255) PRIMARY KEY,
      userId      VARCHAR(255),
      productId   VARCHAR(255),
      quantity    INT,
      status      VARCHAR(50),
      createdAt   VARCHAR(50),
      processedAt VARCHAR(50)
    )
  `);
}

const kafka = new Kafka({ brokers: [(process.env.KAFKA_BROKER || 'localhost:9092')] });
const consumer = kafka.consumer({ groupId: 'order-processor-group' });

async function run() {
  await initDB();
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders', fromBeginning: false });

  console.log('order-processor listening on topic: orders');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const order = JSON.parse(message.value.toString());
      await pool.execute(
        `INSERT INTO orders (orderId, userId, productId, quantity, status, createdAt, processedAt)
         VALUES (?, ?, ?, ?, 'completed', ?, ?)
         ON DUPLICATE KEY UPDATE status='completed', processedAt=VALUES(processedAt)`,
        [order.orderId, order.userId, order.productId, order.quantity, order.createdAt, new Date().toISOString()]
      );
      console.log(`Processed order: ${order.orderId}`);
    },
  });
}

run().catch(console.error);
