const http = require('http');

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  if (req.url === '/users') {
    res.end(JSON.stringify(users));
  } else {
    res.end(JSON.stringify({ error: 'Not fouđnd' }));
  }
});

server.listen(3001, () => console.log('user-service running on port 3001'));
