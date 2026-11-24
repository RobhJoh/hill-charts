// oEmbed "rich" response so Iframely/Notion can classify the page as an embeddable player.
module.exports = (req, res) => {
  const base = 'https://notion-embed-lime.vercel.app/';
  const src = base + '?v=' + encodeURIComponent((req.query && req.query.v) || 'oembed');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    version: '1.0', type: 'rich', provider_name: 'Apogee', title: 'Apogee Notion-probe',
    width: 700, height: 420,
    html: `<iframe src="${src}" width="700" height="420" style="border:0" allow="fullscreen"></iframe>`,
  }));
};
