import { createServer } from './server.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.API_HOST || '0.0.0.0';

async function start() {
  const server = await createServer();

  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`✨ Hisaab API server running at http://${HOST}:${PORT}`);
    console.log(`📖 OpenAPI documentation available at http://${HOST}:${PORT}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
