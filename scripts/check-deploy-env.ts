/**
 * Validates the deployment variables in .env without ever printing a value.
 * Also runs read-only RPC checks (no transactions are sent).
 * Output is PASS/FAIL lines and non-secret values only.
 * Run: bun run scripts/check-deploy-env.ts [path-to-env-file]  (default .env)
 */
import { existsSync, readFileSync } from 'node:fs';
import { privateKeyToAddress } from 'viem/accounts';
import { formatUsdc } from '../src/onchain-money';

const ENV_PATH = process.argv[2] ?? '.env';
const EXAMPLE_PATH = '.env.example';
const MIN_MAX_FEE_WEI = 20_000_000_000n; // Arc floor: 20 gwei
const ARC_MAX_BASE_FEE_WEI = 20_000_000_000_000n; // Arc ceiling: 20,000 gwei
const PRIMARY_RPC = 'https://rpc.mainnet.arc.io';

type Entry = { value: string; line: number };

function parseEnv(path: string): Map<string, Entry> {
  const out = new Map<string, Entry>();
  readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .forEach((raw, i) => {
      const m = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) return;
      let v = m[2].trim();
      if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1);
      else v = v.replace(/\s+#.*$/, '');
      out.set(m[1], { value: v, line: i + 1 });
    });
  return out;
}

let failures = 0;
function report(name: string, ok: boolean, failHint: string): void {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      -> ${failHint}`}`);
}

if (!existsSync(ENV_PATH)) {
  console.log('FAIL  .env not found in the project root. Create it with: cp .env.example .env');
  process.exit(1);
}

const env = parseEnv(ENV_PATH);
const at = (k: string): string => {
  const e = env.get(k);
  return e ? `line ${e.line} (${k})` : `add a line "${k}=..."`;
};

// 1) Private key
const keyEntry = env.get('DEPLOYER_PRIVATE_KEY');
const key = keyEntry?.value ?? '';
let keyOk = false;
let keyHint = `Set ${at('DEPLOYER_PRIVATE_KEY')}.`;
if (!key) keyHint = `${at('DEPLOYER_PRIVATE_KEY')} is empty or missing.`;
else if (!key.startsWith('0x')) keyHint = `${at('DEPLOYER_PRIVATE_KEY')} must start with 0x.`;
else if (key.length !== 66) keyHint = `${at('DEPLOYER_PRIVATE_KEY')} must be 66 characters (0x + 64 hex); it has a different length.`;
else if (!/^0x[0-9a-fA-F]{64}$/.test(key)) keyHint = `${at('DEPLOYER_PRIVATE_KEY')} contains non-hex characters.`;
else keyOk = true;
report('1. DEPLOYER_PRIVATE_KEY set, 0x-prefixed, 66 chars, valid hex', keyOk, keyHint);

// 2) Address format and match against the key
const addrEntry = env.get('DEPLOYER_ADDRESS');
const addr = addrEntry?.value ?? '';
let addrOk = false;
let addrHint = `Set ${at('DEPLOYER_ADDRESS')}.`;
if (!addr) addrHint = `${at('DEPLOYER_ADDRESS')} is empty or missing.`;
else if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) addrHint = `${at('DEPLOYER_ADDRESS')} must be 0x + 40 hex characters (42 total).`;
else if (!keyOk) addrHint = 'Format is valid, but the key check (1) failed so the match cannot be verified. Fix check 1 first.';
else {
  try {
    const derived = privateKeyToAddress(key as `0x${string}`);
    if (derived.toLowerCase() === addr.toLowerCase()) addrOk = true;
    else addrHint = `${at('DEPLOYER_ADDRESS')} is not the address of the key on ${at('DEPLOYER_PRIVATE_KEY')}. Either the address or the key is for a different wallet.`;
  } catch {
    addrHint = 'The key could not be parsed as a valid secp256k1 key (value not shown).';
  }
}
report('2. DEPLOYER_ADDRESS valid (42 chars) and matches the private key', addrOk, addrHint);

// 3) RPC URL
const rpc = env.get('ARC_MAINNET_RPC_URL')?.value ?? '';
let rpcOk = false;
let rpcHint = `Set ${at('ARC_MAINNET_RPC_URL')} to ${PRIMARY_RPC}`;
if (!rpc) rpcHint = `${at('ARC_MAINNET_RPC_URL')} is empty or missing. Use ${PRIMARY_RPC}`;
else if (rpc.replace(/\/+$/, '') === PRIMARY_RPC) rpcOk = true;
else rpcHint = `${at('ARC_MAINNET_RPC_URL')} is not ${PRIMARY_RPC}. Change it to that URL unless you intentionally use another provider.`;
report(`3. ARC_MAINNET_RPC_URL is ${PRIMARY_RPC}`, rpcOk, rpcHint);

// 4) Gas variables
const feeRaw = env.get('ARC_MAX_FEE_WEI')?.value ?? '';
const tipRaw = env.get('ARC_PRIORITY_FEE_WEI')?.value ?? '';
let gasOk = false;
let gasHint = '';
if (!/^\d+$/.test(feeRaw)) gasHint = `${at('ARC_MAX_FEE_WEI')} must be a plain integer in wei (e.g. 30000000000 for 30 gwei).`;
else if (!/^\d+$/.test(tipRaw)) gasHint = `${at('ARC_PRIORITY_FEE_WEI')} must be a plain integer in wei (e.g. 1000000000 for 1 gwei).`;
else {
  const fee = BigInt(feeRaw);
  const tip = BigInt(tipRaw);
  if (fee < MIN_MAX_FEE_WEI) gasHint = `${at('ARC_MAX_FEE_WEI')} is below Arc's 20 gwei floor (20000000000 wei). If you entered gwei, convert to wei.`;
  else if (fee > ARC_MAX_BASE_FEE_WEI) gasHint = `${at('ARC_MAX_FEE_WEI')} is above Arc's 20,000 gwei ceiling; likely a unit mistake.`;
  else if (tip > fee) gasHint = `${at('ARC_PRIORITY_FEE_WEI')} must not exceed ARC_MAX_FEE_WEI.`;
  else gasOk = true;
}
report('4. ARC_MAX_FEE_WEI >= 20 gwei and ARC_PRIORITY_FEE_WEI sensible (wei integers)', gasOk, gasHint);

// 5) AgentPayConfig.sol still has the expected USDC address
const EXPECTED_USDC = '0x3600000000000000000000000000000000000000';
const CONFIG_PATH = 'contracts/AgentPayConfig.sol';
let cfgOk = false;
let cfgHint = `${CONFIG_PATH} not found.`;
if (existsSync(CONFIG_PATH)) {
  const src = readFileSync(CONFIG_PATH, 'utf8');
  const m = src.match(/address\s+constant\s+USDC_ADDRESS\s*=\s*(0x[0-9a-fA-F]{40})\s*;/);
  if (!m) cfgHint = `${CONFIG_PATH}: could not find the USDC_ADDRESS constant.`;
  else if (m[1].toLowerCase() !== EXPECTED_USDC) cfgHint = `${CONFIG_PATH}: USDC_ADDRESS is ${m[1]}, expected ${EXPECTED_USDC}.`;
  else cfgOk = true;
}
report(`5. AgentPayConfig.sol USDC_ADDRESS = ${EXPECTED_USDC}`, cfgOk, cfgHint);

// 6-8) Live read-only checks (JSON-RPC reads only; nothing is signed or sent)
async function rpcCall(url: string, method: string, params: unknown[]): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (json.error || typeof json.result !== 'string') throw new Error(json.error?.message ?? 'no result');
  return json.result;
}

const rpcUrlOk = /^https:\/\/\S+$/.test(rpc);
// If .env has no usable RPC URL, fall back to Circle's public endpoint so the live checks still run.
const liveRpc = rpcUrlOk ? rpc : PRIMARY_RPC;
const liveNote = rpcUrlOk ? '' : ' [via public Arc RPC, since .env has none]';
{
  // 6) chain id
  try {
    const chainId = Number(BigInt(await rpcCall(liveRpc, 'eth_chainId', [])));
    report(`6. Live: chain ID is 5042 (got ${chainId})${liveNote}`, chainId === 5042, 'The RPC is not Arc mainnet. Fix ARC_MAINNET_RPC_URL.');
  } catch (e) {
    report(`6. Live: chain ID is 5042${liveNote}`, false, `RPC request failed: ${(e as Error).message}`);
  }

  // 7) gas price
  try {
    const gasPrice = BigInt(await rpcCall(liveRpc, 'eth_gasPrice', []));
    const gwei = Number(gasPrice) / 1e9;
    const feeWei = /^\d+$/.test(feeRaw) ? BigInt(feeRaw) : 0n;
    const covered = feeWei >= gasPrice;
    report(
      `7. Live: gas price ${gwei.toFixed(2)} gwei (${gasPrice} wei)${covered ? ', covered by ARC_MAX_FEE_WEI' : ''}`,
      covered,
      `${at('ARC_MAX_FEE_WEI')} is below the current gas price. Raise it above ${gasPrice} wei.`,
    );
  } catch (e) {
    report('7. Live: current gas price', false, `RPC request failed: ${(e as Error).message}`);
  }

  // 8) USDC balance (ERC-20 view, 6 decimals: the same pool that pays gas)
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    report('8. Live: DEPLOYER_ADDRESS USDC balance', false, `Skipped: ${at('DEPLOYER_ADDRESS')} is not a valid address.`);
  } else {
    try {
      const data = '0x70a08231' + addr.slice(2).toLowerCase().padStart(64, '0');
      const raw = BigInt(await rpcCall(liveRpc, 'eth_call', [{ to: EXPECTED_USDC, data }, 'latest']));
      report(
        `8. Live: DEPLOYER_ADDRESS holds ${formatUsdc(raw)} USDC (gas is paid from this)`,
        raw > 0n,
        'Balance is 0. Fund the deployer wallet with USDC on Arc mainnet before deploying.',
      );
    } catch (e) {
      report('8. Live: DEPLOYER_ADDRESS USDC balance', false, `RPC request failed: ${(e as Error).message}`);
    }
  }
}

// 9) Safety: the committed example file must not contain a secret
let exampleOk = true;
let exampleHint = '';
if (existsSync(EXAMPLE_PATH)) {
  const ex = parseEnv(EXAMPLE_PATH).get('DEPLOYER_PRIVATE_KEY');
  if (ex && ex.value.length > 0) {
    exampleOk = false;
    exampleHint = `${EXAMPLE_PATH} line ${ex.line} contains a value for DEPLOYER_PRIVATE_KEY. Blank it now; .env.example must hold no secrets.`;
  }
}
report('9. .env.example contains no private key', exampleOk, exampleHint);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
