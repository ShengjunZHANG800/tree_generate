const { chromium } = require("playwright");
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

const root = path.resolve(__dirname, "..");
const python = path.join(root, ".venv", "Scripts", "python.exe");

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/limits`);
      if (response.ok) return;
    } catch {
      // Retry until uvicorn is accepting requests.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Server did not start at ${url}`);
}

async function main() {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(
    python,
    ["-m", "uvicorn", "ewens_app.main:app", "--host", "127.0.0.1", "--port", String(port)],
    { cwd: root, stdio: "pipe" },
  );
  let serverOutput = "";
  server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

  let browser;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(baseUrl);
    await page.waitForSelector("#metrics-grid .metric-card", { timeout: 20000 });
    await page.click("#lang-zh");
    await page.waitForFunction(() => document.querySelector("#tab-lab")?.textContent.includes("树实验"), null, { timeout: 10000 });
    const zhButton = await page.locator("#lang-zh").textContent();
    if (!zhButton.includes("中文")) throw new Error("Chinese language button text is corrupted.");
    await page.click("#lang-en");
    await page.fill("#n", "160");
    await page.fill("#draw-limit", "160");
    await page.click("#generate-button");
    await page.waitForFunction(() => document.querySelector("#table-note")?.textContent.includes("160"), null, { timeout: 30000 });
    await page.fill("#node-data-id", "7");
    await page.click("#node-data-show");
    await page.waitForFunction(() => document.querySelector("#node-data-details")?.textContent.includes("subtree avg depth"), null, { timeout: 10000 });
    await page.click("#node-data-locate");
    await page.waitForFunction(() => document.querySelector("#node-inspector")?.textContent.includes("subtree leaves"), null, { timeout: 10000 });
    await page.selectOption("#tree-highlight-mode", "degree_ge");
    await page.fill("#tree-highlight-value", "3");
    await page.click("#tree-highlight-apply");
    await page.waitForFunction(() => document.querySelector("#tree-highlight-note")?.textContent.includes("degree >= 3"), null, { timeout: 10000 });
    await page.selectOption("#tree-highlight-mode", "leaves");
    await page.click("#tree-highlight-apply");
    await page.waitForFunction(() => document.querySelector("#tree-highlight-note")?.textContent.includes("Leaves"), null, { timeout: 10000 });
    await page.selectOption("#tree-highlight-mode", "subtree_ge");
    await page.fill("#tree-highlight-value", "3");
    await page.waitForFunction(() => document.querySelector("#tree-highlight-note")?.textContent.includes("Ready to apply"), null, { timeout: 10000 });
    await page.fill("#tree-highlight-value", "3.5");
    await page.waitForFunction(() => document.querySelector("#tree-highlight-note")?.textContent.includes("Enter a non-negative integer"), null, { timeout: 10000 });
    await page.fill("#tree-highlight-value", "3");
    await page.click("#tree-highlight-apply");
    await page.waitForFunction(() => document.querySelector("#tree-highlight-note")?.textContent.includes("subtree size >= 3"), null, { timeout: 10000 });
    const profileBox = await page.locator("#profile-chart").boundingBox();
    await page.locator("#profile-chart").click({
      position: { x: profileBox.width * 0.28, y: profileBox.height * 0.5 },
    });
    await page.waitForFunction(() => document.querySelector("#tree-highlight-mode")?.value === "depth_eq", null, { timeout: 10000 });

    await page.click("#tab-smalln");
    await page.waitForSelector("#smalln-table tr", { timeout: 20000 });
    await page.waitForSelector("#smalln-diff-table tr", { timeout: 20000 });
    const diffRows = await page.locator("#smalln-diff-table tr").count();
    if (diffRows < 1) throw new Error("Small-n difference table did not render rows.");
    const divergenceCards = await page.locator("#smalln-divergence .scan-analysis-card").count();
    if (divergenceCards < 4) throw new Error("Small-n divergence overview did not render cards.");
    const divergenceText = await page.locator("#smalln-divergence").textContent();
    if (!divergenceText.includes("TV distance")) throw new Error("Small-n divergence overview did not render the TV distance card.");

    await page.click("#tab-lab");
    await page.check('input[name="scan-model"][value="uniform_recursive"]');
    await page.fill("#scan-theta-values", "1.5,2.5");
    await page.fill("#scan-n-values", "30");
    await page.fill("#scan-samples", "1");
    await page.click("#scan-button");
    await page.waitForFunction(() => document.querySelectorAll("#scan-group-table tr").length >= 3, null, { timeout: 30000 });
    const firstModel = await page.locator("#scan-group-table tr:first-child td:first-child").textContent();
    if (!firstModel || !firstModel.trim()) throw new Error("Scan model column is empty.");
  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  if (server.exitCode && server.exitCode !== 0) {
    throw new Error(serverOutput || `uvicorn exited with ${server.exitCode}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
