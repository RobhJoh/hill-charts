// Sets a third-party-style cookie and echoes back what the browser sent.
module.exports = (req, res) => {
  res.setHeader('Set-Cookie', `probe=${Date.now()}; Path=/; Max-Age=86400; SameSite=None; Secure`);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ received: req.headers.cookie || null }));
};
