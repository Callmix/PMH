// index.js - Full backend for PMH claim checking via ngrok

const http = require('http');
const ngrok = require('@ngrok/ngrok');
const url = require('url');
const { ethers } = require('ethers');

const PMH_CONTRACT = '0x1CA466c720021ACf885370458092BdD8De48FE01';
const CLAIM_COOLDOWN_SECONDS = 43200; // 12 hours
const provider = new ethers.providers.JsonRpcProvider('https://rpc.worldchain.xyz');

const abi = [
  "function lastClaimTime(address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

const contract = new ethers.Contract(PMH_CONTRACT, abi, provider);

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/check-cooldown' && req.method === 'GET') {
    const { address } = parsedUrl.query;

    if (!address) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing address' }));
      return;
    }

    try {
      const lastTime = await contract.lastClaimTime(address);
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(lastTime.toNumber() + CLAIM_COOLDOWN_SECONDS - now, 0);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        address,
        canClaim: remaining <= 0,
        cooldownSeconds: remaining
      }));
    } catch (err) {
      console.error('Cooldown check failed:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal error', details: err.message }));
    }

  } else if (parsedUrl.pathname === '/log-transfer' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      console.log('Received transfer:', body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    });

  } else if (parsedUrl.pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Server live!' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(8080, async () => {
  console.log('Server running on port 8080');
  const listener = await ngrok.connect({ addr: 8080, authtoken_from_env: true });
  console.log(`Ngrok tunnel: ${listener.url()}`);
});
