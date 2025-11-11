/**
 * Simple Poker demo WebSocket server.
 * Broadcasts actions to all clients at a table.
 */
const WebSocket = require('ws');
const PORT = process.env.PORT || 8787;
const wss = new WebSocket.Server({ port: PORT });
console.log(`[Poker WS] listening on ws://localhost:${PORT}`);

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('message', (data) => {
    // naive broadcast
    for (const c of clients) {
      if (c.readyState === WebSocket.OPEN) {
        c.send(data.toString());
      }
    }
  });
  ws.on('close', () => clients.delete(ws));
});
