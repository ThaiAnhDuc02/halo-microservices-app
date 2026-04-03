const http = require('http');
const { MongoClient } = require('mongodb');
const mysql = require('mysql2/promise');

const mongoClient = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017');
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'admin',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME     || 'microservices',
  waitForConnections: true,
});

async function initMySQL() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS internal_products (
      id       VARCHAR(255) PRIMARY KEY,
      name     VARCHAR(255),
      price    DECIMAL(10,2),
      category VARCHAR(255),
      brand    VARCHAR(255)
    )
  `);
  // seed nếu chưa có
  const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM internal_products');
  if (rows[0].cnt === 0) {
    await pool.execute(`INSERT INTO internal_products VALUES
      ('int-1', 'Laptop Pro', 1299.00, 'electronics', 'InternalBrand'),
      ('int-2', 'Wireless Mouse', 29.99, 'accessories', 'InternalBrand')
    `);
  }
}

async function run() {
  await mongoClient.connect();
  await initMySQL();
  console.log('product-service ready');

  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'GET' && req.url === '/products') {
      try {
        const col = mongoClient.db('microservices').collection('products');
        const [internalRows] = await pool.execute('SELECT * FROM internal_products');
        const externalDocs = await col.find({}, { projection: { _id: 0 } }).toArray();

        const internal = internalRows.map(p => ({ ...p, source: 'internal' }));
        const external = externalDocs.map(p => ({ ...p, source: 'external' }));

        res.writeHead(200);
        res.end(JSON.stringify([...internal, ...external]));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(3002, () => console.log('product-service running on port 3002'));
}

run().catch(err => { console.error(err); process.exit(1); });
