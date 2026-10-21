import { parseOrder } from './index';

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Set GEMINI_API_KEY');
  const chat = 'Assalam, Ali here. 2 darjan chai cups, cup 150 ka. Address house 123, Shadman phase 2, Lahore. Number 0300-1234567. 500 advance bhej diya.';
  const parsed = await parseOrder(chat, { apiKey });
  console.log(JSON.stringify(parsed, null, 2));
}
run().catch(console.error);
