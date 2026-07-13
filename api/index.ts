import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApiApp, bootstrapAdmin } from '../src/server/apiApp.js';

const app = createApiApp();
let bootstrapped: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!bootstrapped) {
    bootstrapped = bootstrapAdmin().catch(console.error);
  }
  await bootstrapped;
  app(req as any, res as any);
}
