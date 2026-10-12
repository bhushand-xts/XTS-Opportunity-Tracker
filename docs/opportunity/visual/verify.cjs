/* Isolated visual verification; no real auth or business mutations. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const dist = path.join(__dirname, 'dist');
const artifacts = path.join(dist, 'verification');
fs.mkdirSync(artifacts, { recursive: true });
const references = new Set(['opportunity_pipeline_redesign.html', 'sales_head_approval_pipeline.html', 'ceo_gate1_approval_pipeline.html']);
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  let file;
  if (pathname.startsWith('/reference/')) {
    const name = pathname.slice('/reference/'.length);
    if (!references.has(name)) { res.writeHead(404).end(); return; }
    file = path.join(root, 'docs/reference/opportunity', name);
  } else if (/^\/[\w.-]+\.js$/.test(pathname)) file = path.join(dist, pathname.slice(1));
  else file = path.join(dist, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : 'text/html; charset=utf-8');
  res.end(fs.readFileSync(file));
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class CDP {
  constructor(socket) {
    this.socket = socket; this.next = 1; this.pending = new Map(); this.errors = [];
    socket.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.id) { const pending = this.pending.get(msg.id); if (pending) { this.pending.delete(msg.id); clearTimeout(pending.timer); msg.error ? pending.reject(new Error(msg.error.message)) : pending.resolve(msg.result); } }
      if (msg.method === 'Runtime.exceptionThrown') this.errors.push(msg.params.exceptionDetails.text + ': ' + (msg.params.exceptionDetails.exception?.description || ''));
    });
  }
  call(method, params = {}) {
    const id = this.next++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
}
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  return new CDP(socket);
}
(async () => {
  await new Promise(resolve => server.listen(3199, '127.0.0.1', resolve));
  const edge = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const externalPort = Number(process.argv[2]) || null;
  const profile = path.join(dist, 'browser-profile-' + Date.now());
  const browser = externalPort ? null : spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let cdp;
  const report = [];
  try {
    const activePort = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; !externalPort && i < 150 && !fs.existsSync(activePort); i++) await delay(100);
    if (!externalPort && !fs.existsSync(activePort)) throw new Error('Headless Chrome did not expose DevTools.');
    const port = externalPort || Number(fs.readFileSync(activePort, 'utf8').split('\n')[0]);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    cdp = await connect(targets.find(x => x.type === 'page').webSocketDebuggerUrl);
    await cdp.call('Page.enable'); await cdp.call('Runtime.enable');
    const scenarios = [
      ['pipeline', '/opportunity?scenario=pipeline', null],
      ['new', '/opportunity/new?scenario=new', null],
      ['questionnaire', '/opportunity/401/edit?scenario=questionnaire', null],
      ['generic', '/opportunity/401/edit?scenario=generic', null],
      ['details', '/opportunity/401/details?scenario=details', null],
      ['sales', '/opportunity/401/review?scenario=sales', null],
      ['ceo', '/opportunity/401/review?scenario=ceo', null],
      ['reference-new', '/reference/opportunity_pipeline_redesign.html', 'newOpportunity()'],
      ['reference-generic', '/reference/opportunity_pipeline_redesign.html', "newOpportunity();chooseType('Generic')"],
      ['reference-sales', '/reference/sales_head_approval_pipeline.html', 'openOpportunity(opportunities[0].id)'],
      ['reference-ceo', '/reference/ceo_gate1_approval_pipeline.html', 'openOpportunity(opportunities[0].id)'],
    ];
    for (const [width, height] of [[1440,1000], [1024,900], [390,844]]) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      for (const [name, url, prepare] of scenarios) {
        cdp.errors = [];
        await cdp.call('Page.navigate', { url: 'http://127.0.0.1:3199' + url });
        for (let i=0;i<150;i++) { if (await cdp.evaluate("document.readyState === 'complete' && !!document.querySelector('h2, #main h1')")) break; await delay(100); }
        await delay(250);
        if (prepare) await cdp.evaluate(prepare);
        await delay(200);
        const metrics = await cdp.evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,heading:document.querySelector('.opp-heading h2,#main h1')?.textContent,fields:document.querySelectorAll('input,textarea,[role=combobox]').length,panels:document.querySelectorAll('.opp-panel,.panel,.previewcard').length,overflow:document.documentElement.scrollWidth>innerWidth+1,saveAfterRfp:!document.querySelector('.opp-savebar')||document.querySelector('.opp-intake').compareDocumentPosition(document.querySelector('.opp-savebar'))&Node.DOCUMENT_POSITION_FOLLOWING})`);
        const screenshot = await cdp.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        const filename = `${name}-${width}.png`;
        fs.writeFileSync(path.join(artifacts, filename), Buffer.from(screenshot.data, 'base64'));
        report.push({ scenario:name, width, height, filename, ...metrics, errors:[...cdp.errors] });
        console.log(`${name} ${width}: overflow=${metrics.overflow}, fields=${metrics.fields}, panels=${metrics.panels}, errors=${cdp.errors.length}`);
      }
    }
    fs.writeFileSync(path.join(artifacts,'report.json'), JSON.stringify(report,null,2));
    if (report.some(x => x.overflow || x.errors.length)) process.exitCode=1;
  } finally {
    if (cdp) { try { await cdp.call('Browser.close'); } catch {} cdp.socket.close(); }
    browser?.kill(); server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode=1; });
