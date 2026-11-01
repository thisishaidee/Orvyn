import "dotenv/config";
import { appendFileSync, chmodSync, existsSync, readFileSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const envPath = ".env";
if (!existsSync(envPath)) {
  throw new Error("Create agent/.env from agent/.env.example first. The wallet key will be stored only in that local file.");
}

const existingEnv = readFileSync(envPath, "utf8");
if (/^AGENT_PRIVATE_KEY\s*=\s*\S+/m.test(existingEnv)) {
  throw new Error("An AGENT_PRIVATE_KEY is already configured. Refusing to replace it.");
}

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

appendFileSync(envPath, `\n# Locally generated agent delegate wallet\nAGENT_PRIVATE_KEY=${privateKey}\n`, { mode: 0o600 });
chmodSync(envPath, 0o600);

console.log("A new agent wallet was created and saved to agent/.env.");
console.log(`Public address: ${account.address}`);
console.log("The private key was not printed. Keep agent/.env private and never commit or share it.");
