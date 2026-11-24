// Server-sent events: one tick per second for 25 s, then closes (client reconnects).
module.exports = async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  for (let i = 1; i <= 25; i++) {
    res.write(`data: ${JSON.stringify({ n: i, t: Date.now() })}\n\n`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  res.end();
};
