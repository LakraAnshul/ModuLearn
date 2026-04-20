import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/models';
const ANTHROPIC_VERSION = '2023-06-01';
const REQUEST_TIMEOUT_MS = 20000;
const MAX_CONCURRENCY = 3;
const MAX_RETRIES = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskKey(key) {
  const trimmed = key.trim();

  if (trimmed.length <= 10) {
    return `${trimmed.slice(0, 3)}...${trimmed.slice(-2)}`;
  }

  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function splitKeys(rawText) {
  return rawText
    .split(/[\n,\t]/)
    .map((key) => sanitizeKey(key))
    .filter(Boolean);
}

function sanitizeKey(key) {
  const trimmed = key.trim();
  return trimmed.replace(/^['\"]+|['\"]+$/g, '');
}

function classifyResult(status, message) {
  if (status === 401) {
    return 'INVALID_KEY';
  }

  if (status === 403) {
    return 'FORBIDDEN_OR_NO_ACCESS';
  }

  if (status === 429) {
    return 'RATE_LIMITED';
  }

  if (status >= 500 && status <= 599) {
    return 'SERVER_ERROR';
  }

  if (status === 0) {
    return 'NETWORK_ERROR';
  }

  if (!status) {
    return 'UNKNOWN_ERROR';
  }

  return message ? 'REQUEST_FAILED' : 'REQUEST_FAILED_NO_DETAILS';
}

function parseRetryAfterMs(retryAfterValue) {
  if (!retryAfterValue) {
    return null;
  }

  const asSeconds = Number(retryAfterValue);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }

  const asDate = Date.parse(retryAfterValue);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }

  return null;
}

function shouldRetry(status) {
  return status === 429 || (status >= 500 && status <= 599) || status === 0;
}

function getBackoffMs(attempt) {
  const base = 400;
  return base * 2 ** attempt;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function runWorker() {
    while (true) {
      const myIndex = currentIndex;
      currentIndex += 1;

      if (myIndex >= items.length) {
        return;
      }

      results[myIndex] = await worker(items[myIndex], myIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => runWorker()
  );

  await Promise.all(workers);
  return results;
}

async function readKeysFromPrompt() {
  const rl = readline.createInterface({ input, output });
  const lines = [];

  console.log('Paste Claude API keys, one per line or comma-separated.');
  console.log('Press Enter on an empty line to finish.');

  while (true) {
    const line = await rl.question('> ');

    if (!line.trim()) {
      break;
    }

    lines.push(line);
  }

  rl.close();

  return splitKeys(lines.join('\n'));
}

async function readKeysFromStdin() {
  const chunks = [];

  for await (const chunk of input) {
    chunks.push(chunk);
  }

  return splitKeys(chunks.join(''));
}

async function testKey(apiKey) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        signal: controller.signal,
      });

      let message = '';

      try {
        const body = await response.json();
        message = body?.error?.message || body?.message || '';
      } catch {
        message = '';
      }

      const reason = classifyResult(response.status, message);

      if (!response.ok && shouldRetry(response.status) && attempt < MAX_RETRIES) {
        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
        const delayMs = retryAfterMs ?? getBackoffMs(attempt);
        await sleep(delayMs);
        continue;
      }

      return {
        ok: response.ok,
        status: response.status,
        message,
        reason,
      };
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const message = isAbort
        ? `Request timed out after ${REQUEST_TIMEOUT_MS}ms`
        : error instanceof Error
          ? error.message
          : 'Unknown network error';

      if (attempt < MAX_RETRIES) {
        await sleep(getBackoffMs(attempt));
        continue;
      }

      return {
        ok: false,
        status: 0,
        message,
        reason: classifyResult(0, message),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: false,
    status: 0,
    message: 'Retry attempts exhausted',
    reason: 'UNKNOWN_ERROR',
  };
}

async function main() {
  const providedKeys = process.argv.slice(2).filter(Boolean);
  const keys = providedKeys.length > 0
    ? splitKeys(providedKeys.join('\n'))
    : input.isTTY
      ? await readKeysFromPrompt()
      : await readKeysFromStdin();

  if (keys.length === 0) {
    console.error('No API keys were provided.');
    process.exitCode = 1;
    return;
  }

  const results = await mapWithConcurrency(keys, MAX_CONCURRENCY, async (key) => {
    try {
      const result = await testKey(key);

      return {
        key,
        ...result,
      };
    } catch (error) {
      return {
        key,
        ok: false,
        status: 0,
        message: error instanceof Error ? error.message : 'Unknown network error',
        reason: 'NETWORK_ERROR',
      };
    }
  });

  const workingKeys = results.filter((result) => result.ok);
  const failingKeys = results.filter((result) => !result.ok);

  console.log('\nResults');
  console.log('-------');

  for (const result of results) {
    const label = maskKey(result.key);
    const statusText = result.ok ? 'WORKS' : `FAILS (${result.status})`;
    const reasonText = result.reason ? ` [${result.reason}]` : '';
    const details = result.message ? ` - ${result.message}` : '';

    console.log(`${label}: ${statusText}${reasonText}${details}`);
  }

  console.log('\nSummary');
  console.log('--------');
  console.log(`Working keys: ${workingKeys.length}`);
  console.log(`Failed keys: ${failingKeys.length}`);

  if (workingKeys.length > 0) {
    console.log('\nKeys that worked:');
    for (const result of workingKeys) {
      console.log(`- ${maskKey(result.key)}`);
    }
  }

  process.exitCode = workingKeys.length > 0 ? 0 : 1;
}

main().catch((error) => {
  console.error('Unexpected error while checking keys.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});