import { env } from './config/env';
import { buildApp } from './app';

async function start() {
  const app = buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
