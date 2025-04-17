const http = require('http');
const ngrok = require('@ngrok/ngrok');
const url = require('url');

// Create basic HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Server live!' }));
  }

  else if (parsedUrl.pathname === '/log-transfer' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      console.log('Received transfer:', body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    });
  }

  else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start server
server.listen(8080, async () => {
  console.log('Server running on port 8080');
  const listener = await ngrok.connect({ addr: 8080, authtoken_from_env: true });
  console.log(`Ngrok tunnel: ${listener.url()}`);
});
