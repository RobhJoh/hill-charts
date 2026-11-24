// Logs which stage of the page loaded (html image vs. script) for a device.
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'image/gif');
  res.end(Buffer.from('R0lGODlhAQABAAAAACw=', 'base64'));
};
