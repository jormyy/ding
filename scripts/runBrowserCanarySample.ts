import { execFileSync } from "node:child_process";

const modes = process.argv.slice(2);
const sample = modes.length > 0 ? modes : ["players-choice", "smoke-hole", "lightning", "jokers-in", "pandemonium"];
const session = process.env.AGENT_BROWSER_SESSION ?? `ding-canary-${Date.now()}`;

for (const mode of sample) {
  console.log(`[canary] preparing browser room for ${mode}`);
  runAgent(["close"], false);
  runAgent(["open", "http://localhost:3000"]);
  runAgent(["find", "role", "button", "click", "--name", "Deal me in"]);
  runAgent(["wait", "--text", "Your name"]);
  runAgent(["find", "label", "Your name", "fill", "Alpha"]);
  runAgent(["find", "role", "button", "click", "--name", "Enter Room"]);
  runAgent(["wait", "--text", "Browse modes"]);

  const url = runAgent(["get", "url"]).trim().split(/\s+/).at(-1);
  const room = url?.match(/\/room\/([A-Z0-9]+)/)?.[1];
  const pidRaw = runAgent(["eval", "sessionStorage.getItem('ding-player-id')"]).trim();
  const alphaPid = JSON.parse(pidRaw) as string;
  if (!room || !alphaPid) throw new Error(`Could not discover room/pid for ${mode}: ${url} ${pidRaw}`);

  execFileSync(
    "npx",
    ["tsx", "scripts/browserCanary.ts", "--mode", mode, "--room", room, "--alpha-pid", alphaPid],
    { env: { ...process.env, AGENT_BROWSER_SESSION: session }, stdio: "inherit" }
  );
}

runAgent(["close"], false);

function runAgent(args: string[], fail = true): string {
  try {
    return execFileSync("agent-browser", args, {
      env: { ...process.env, AGENT_BROWSER_SESSION: session },
      encoding: "utf8",
      stdio: ["ignore", "pipe", fail ? "inherit" : "pipe"],
    });
  } catch (error) {
    if (fail) throw error;
    return "";
  }
}
