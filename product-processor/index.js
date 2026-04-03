const { Kafka } = require('kafkajs');
const { MongoClient } = require('mongodb');

const mongoClient = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017');
const kafka = new Kafka({ brokers: [(process.env.KAFKA_BROKER || 'localhost:9092')] });
const consumer = kafka.consumer({ groupId: 'product-processor-group' });

async function run() {
  await mongoClient.connect();
  const col = mongoClient.db('microservices').collection('products');
  await col.createIndex({ id: 1 }, { unique: true });
  console.log('product-processor connected to MongoDB');

  await consumer.connect();
  await consumer.subscribe({ topic: 'external-products', fromBeginning: true });
  console.log('product-processor listening on topic: external-products');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const product = JSON.parse(message.value.toString());
      await col.updateOne(
        { id: product.id },
        { $set: { ...product, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      console.log(`Upserted product: ${product.id} - ${product.name}`);
    },
  });
}

run().catch(err => { console.error(err); process.exit(1); });
