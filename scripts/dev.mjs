// One dev command for the standalone landing site and its embedded playground.
import { dev } from 'astro';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = new URL('../', import.meta.url);
const playgroundRoot = new URL('../playground/', import.meta.url);
const requirePlayground = createRequire(new URL('package.json', playgroundRoot));
const { createServer } = await import(requirePlayground.resolve('vite'));
const { values } = parseArgs({ options: {
  host: { type: 'string', default: '127.0.0.1' },
  port: { type: 'string', default: '4321' },
} });
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid --port');
const play = await createServer({
  root: fileURLToPath(playgroundRoot),
  base: '/play/',
  server: { host: '127.0.0.1', port: 0, strictPort: false, open: false },
});
let site;
try {
  await play.listen();
  const address = play.httpServer.address();
  if (!address || typeof address === 'string') throw new Error('No playground port');
  site = await dev({
    root: fileURLToPath(root),
    server: { host: values.host, port, open: false },
    vite: { server: { strictPort: true, proxy: {
      '/play/': { target: `http://127.0.0.1:${address.port}`, ws: true },
    } } },
  });
} catch (error) {
  await play.close();
  throw error;
}
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await site.stop();
  await play.close();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
