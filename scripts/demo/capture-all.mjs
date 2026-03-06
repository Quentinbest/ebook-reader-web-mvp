import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appUrl = process.env.APP_URL || 'http://127.0.0.1:4178';
const designUrl = process.env.DESIGN_URL || 'http://127.0.0.1:4174/03-final-screens.html';
const outDir = process.env.OUT_DIR || '/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture';
const designHost = process.env.DESIGN_HOST || '127.0.0.1';
const designPort = process.env.DESIGN_PORT || '4174';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serveScript = path.join(scriptDir, 'serve-frozen-design.mjs');

function waitForHttp(url, timeoutMs = 15000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if ((response.statusCode ?? 500) < 500) {
          resolve();
          return;
        }
        retry(new Error(`Unexpected status ${response.statusCode}`));
      });

      request.on('error', retry);
      request.setTimeout(3000, () => request.destroy(new Error('Request timeout')));
    };

    const retry = (error) => {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(error);
        return;
      }
      setTimeout(attempt, 300);
    };

    attempt();
  });
}

function runNodeScript(scriptPath, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv }
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${path.basename(scriptPath)} exited with code ${code ?? 'unknown'}`));
    });
    child.on('error', reject);
  });
}

function startDesignServerIfNeeded() {
  return new Promise(async (resolve, reject) => {
    try {
      await waitForHttp(designUrl, 1500);
      resolve({ started: false, stop: async () => {} });
      return;
    } catch {
      // Need to start the local design server.
    }

    const child = spawn(process.execPath, [serveScript], {
      stdio: 'inherit',
      env: {
        ...process.env,
        DESIGN_HOST: designHost,
        DESIGN_PORT: designPort
      }
    });

    const stop = async () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    };

    child.on('error', reject);

    try {
      await waitForHttp(designUrl, 15000);
      resolve({ started: true, stop });
    } catch (error) {
      await stop();
      reject(error);
    }
  });
}

async function main() {
  await waitForHttp(appUrl, 5000).catch(() => {
    throw new Error(`App preview is not reachable at ${appUrl}. Start it before running demo:capture:all.`);
  });

  const designServer = await startDesignServerIfNeeded();

  try {
    await runNodeScript(path.join(scriptDir, 'capture-mobile-shell.mjs'), { APP_URL: appUrl, OUT_DIR: outDir });
    await runNodeScript(path.join(scriptDir, 'capture-mobile-panes.mjs'), { APP_URL: appUrl, OUT_DIR: outDir });
    await runNodeScript(path.join(scriptDir, 'capture-desktop-visual.mjs'), {
      APP_URL: appUrl,
      OUT_DIR: outDir,
      DESIGN_URL: designUrl
    });

    console.log(JSON.stringify({ ok: true, appUrl, designUrl, outDir, startedDesignServer: designServer.started }, null, 2));
  } finally {
    await designServer.stop();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
