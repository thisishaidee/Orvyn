import { useCallback, useMemo, useState } from 'react'
import { CheckCircle2, ExternalLink, FileCheck, Rocket, ShieldAlert, XCircle } from 'lucide-react'
import { arc } from 'viem/chains'
import { createPublicClient, erc20Abi, formatUnits, http, keccak256 } from 'viem'
import { deployContract } from 'viem/actions'
import { useAccount, useConnectorClient, useSwitchChain } from 'wagmi'
import { toast } from 'sonner'
import { Badge, Button, Card, CardHeader, Notice, PageHeader } from '@/components/ui'
import { InfoList, InfoRow } from '@/components/agentpay/Notices'
import { NetworkSwitcher } from '@/components/wallet/NetworkSwitcher'
import artifact from '@/lib/agentpay-artifact.generated.json'

// Expected deployer for mainnet deployments. The page refuses to run otherwise.
const EXPECTED_DEPLOYER = '0xCB2A51B4D34cC6f5dd574F7b5BfA8260E4201C55'
const ARC_MAINNET_RPC = 'https://rpc.mainnet.arc.io'
// Arc mainnet USDC (per docs.arc.io contract addresses and AgentPayConfig.sol).
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'
const EXPLORER = 'https://explorer.arc.io'

// A public client pinned to Arc Mainnet: safety reads never depend on the
// connected wallet being on the right chain.
const mainnetClient = createPublicClient({
  chain: arc,
  transport: http(ARC_MAINNET_RPC),
})

function checkText(state: CheckState, fallback: string): string {
  if (state.status === 'ok') return state.detail
  if (state.status === 'fail') return state.detail
  if (state.status === 'checking') return 'Checking...'
  return fallback ? `Not checked (${fallback.slice(0, 18)}...)` : 'Not checked'
}

const ABI = artifact.abi as never[]
const CREATION_BYTECODE = artifact.bytecode as `0x${string}`

type Phase = 'review' | 'signing' | 'deployed'

type CheckState =
  | { status: 'idle' | 'checking' }
  | { status: 'ok'; detail: string }
  | { status: 'fail'; detail: string }

export function DeployPage() {
  const { address, isConnected, chainId } = useAccount()
  const { data: connectorClient } = useConnectorClient()
  const { switchChain } = useSwitchChain()

  const [phase, setPhase] = useState<Phase>('review')
  const [deployerCheck, setDeployerCheck] = useState<CheckState>({ status: 'idle' })
  const [usdcCheck, setUsdcCheck] = useState<CheckState>({ status: 'idle' })
  const [gasEstimate, setGasEstimate] = useState<bigint | undefined>()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [deployedAddress, setDeployedAddress] = useState<`0x${string}` | undefined>()
  const [postCheck, setPostCheck] = useState<CheckState>({ status: 'idle' })

  const bytecodeHash = useMemo(() => keccak256(CREATION_BYTECODE), [])

  const onRightChain = chainId === arc.id
  const isDeployer = !!address && address.toLowerCase() === EXPECTED_DEPLOYER.toLowerCase()

  // Run the mainnet safety reads: USDC has code + 6 decimals, gas estimate.
  const runSafetyChecks = useCallback(async () => {
    if (!address) return
    setDeployerCheck({ status: 'checking' })
    setUsdcCheck({ status: 'checking' })
    setGasEstimate(undefined)

    if (!isDeployer) {
      setDeployerCheck({ status: 'fail', detail: `Connected wallet ${address} is not the expected deployer ${EXPECTED_DEPLOYER}.` })
      return
    }
    setDeployerCheck({ status: 'ok', detail: address })

    try {
      const [code, decimals] = await Promise.all([
        mainnetClient.getBytecode({ address: USDC_ADDRESS }),
        mainnetClient.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'decimals' }),
      ])
      if (!code || code === '0x') {
        setUsdcCheck({ status: 'fail', detail: 'Arc mainnet USDC has no contract code.' })
        return
      }
      if (decimals !== 6) {
        setUsdcCheck({ status: 'fail', detail: `Arc mainnet USDC reports ${decimals} decimals, expected 6.` })
        return
      }
      setUsdcCheck({ status: 'ok', detail: `${USDC_ADDRESS} (6 decimals, code present)` })

      const gas = await mainnetClient.estimateGas({ account: address, data: CREATION_BYTECODE })
      setGasEstimate(gas)
    } catch (err) {
      setUsdcCheck({ status: 'fail', detail: err instanceof Error ? err.message : 'Safety checks failed.' })
    }
  }, [address, isDeployer])

  // Deploy: wallet-only. The user confirms inside MetaMask; nothing is sent from here.
  const deploy = useCallback(async () => {
    if (!connectorClient || !address) return
    setPhase('signing')
    try {
      const hash = await deployContract(connectorClient, {
        abi: ABI,
        bytecode: CREATION_BYTECODE,
        chain: arc,
        gas: gasEstimate,
      })
      setTxHash(hash)
      toast.info('Transaction submitted. Waiting for the receipt...')

      const receipt = await mainnetClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error(`Deployment reverted (status ${receipt.status}).`)
      const contractAddress = receipt.contractAddress
      if (!contractAddress) throw new Error('Receipt has no contract address.')

      const runtime = await mainnetClient.getBytecode({ address: contractAddress })
      if (!runtime || runtime === '0x') throw new Error('Deployed address has no code.')

      const [usdc, nextLeaseId] = await Promise.all([
        mainnetClient.readContract({ address: contractAddress, abi: ABI, functionName: 'USDC' }),
        mainnetClient.readContract({ address: contractAddress, abi: ABI, functionName: 'nextLeaseId' }),
      ])
      if (usdc !== USDC_ADDRESS) throw new Error(`Contract USDC() is ${usdc}, expected ${USDC_ADDRESS}.`)
      if (nextLeaseId !== 1n) throw new Error(`nextLeaseId() is ${nextLeaseId}, expected 1.`)

      setDeployedAddress(contractAddress)
      setPostCheck({ status: 'ok', detail: `USDC() and nextLeaseId() verified on ${contractAddress}.` })
      setPhase('deployed')
      toast.success('AgentPay deployed and verified')
    } catch (err) {
      setPhase('review')
      toast.error(err instanceof Error ? err.message : 'Deployment failed.')
    }
  }, [connectorClient, address, gasEstimate])

  const allChecksPass = deployerCheck.status === 'ok' && usdcCheck.status === 'ok' && !!gasEstimate

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Deploy"
        title="Deploy AgentPay"
        description="Submit the compiled AgentPay contract to Arc Mainnet with your connected wallet. Nothing is sent until you confirm in MetaMask."
      />

      <Card>
        <CardHeader
          title="1. Wallet and network"
          description="The deployer wallet must match the expected mainnet deployer address."
        />
        {!isConnected ? (
          <Notice tone="info">Connect a wallet to begin.</Notice>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={onRightChain ? 'success' : 'warning'}>
                {onRightChain ? 'Arc Mainnet' : 'Wrong network'}
              </Badge>
              <Badge tone={isDeployer ? 'success' : 'danger'}>
                {isDeployer ? 'Deployer match' : 'Not the deployer wallet'}
              </Badge>
            </div>
            {!onRightChain && (
              <Button variant="primary" onClick={() => switchChain({ chainId: arc.id })}>
                Switch to Arc Mainnet
              </Button>
            )}
            <InfoList>
              <InfoRow label="Connected wallet">{address}</InfoRow>
              <InfoRow label="Expected deployer" hint="Hard-coded in this page.">
                <span className="font-mono text-sm">{EXPECTED_DEPLOYER}</span>
              </InfoRow>
            </InfoList>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="2. Mainnet safety checks"
          description="Reads Arc Mainnet directly. USDC must have code and 6 decimals; gas is estimated from the real creation bytecode."
        />
        <div className="space-y-3">
          <Button variant="secondary" onClick={runSafetyChecks} disabled={!isConnected || !onRightChain}>
            <FileCheck className="size-4" /> Run checks
          </Button>
          <InfoList>
            <InfoRow label="Deployer address">{checkText(deployerCheck, address ?? '')}</InfoRow>
            <InfoRow label="Arc USDC">{checkText(usdcCheck, `${USDC_ADDRESS} (6 decimals expected)`)}</InfoRow>
            <InfoRow label="Gas estimate">
              {gasEstimate
                ? `${gasEstimate.toString()} gas (about ${formatUnits(gasEstimate * 25_000_000_000n, 18)} USDC at 25 gwei)`
                : 'Not checked'}
            </InfoRow>
            <InfoRow label="Creation bytecode">
              <span className="font-mono text-sm">
                {CREATION_BYTECODE.length / 2 - 1} bytes, keccak {bytecodeHash.slice(0, 12)}...
              </span>
            </InfoRow>
          </InfoList>
          {deployerCheck.status === 'fail' && (
            <Notice tone="danger">
              <ShieldAlert className="size-4" /> {deployerCheck.detail}
            </Notice>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="3. Review and confirm"
          description="One creation transaction with the compiled AgentPay bytecode. No constructor arguments: the USDC address is fixed in the contract."
        />
        {phase === 'deployed' && deployedAddress ? (
          <div className="space-y-3">
            <Notice tone="success">
              <CheckCircle2 className="size-4" /> {postCheck.status === 'ok' ? postCheck.detail : 'Deployed.'}
            </Notice>
            <InfoList>
              <InfoRow label="AgentPay address">
                <span className="font-mono text-sm">{deployedAddress}</span>
              </InfoRow>
              <InfoRow label="Transaction">
                {txHash ? (
                  <a className="inline-flex items-center gap-1 underline" href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">
                    {txHash.slice(0, 14)}... <ExternalLink className="size-3.5" />
                  </a>
                ) : '—'}
              </InfoRow>
            </InfoList>
            <a className="inline-flex items-center gap-1 text-sm underline" href={`${EXPLORER}/address/${deployedAddress}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> View on Arcscan
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {phase === 'signing' && (
              <Notice tone="info">Waiting for you to confirm in MetaMask, then for the receipt...</Notice>
            )}
            <Button
              variant="primary"
              onClick={deploy}
              disabled={!allChecksPass || phase === 'signing'}
            >
              <Rocket className="size-4" /> {phase === 'signing' ? 'Waiting for wallet...' : 'Deploy to Arc Mainnet'}
            </Button>
            {!allChecksPass && phase !== 'signing' && (
              <Notice tone="warning">Run the checks above and connect the expected deployer wallet on Arc Mainnet first.</Notice>
            )}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="What this page will never do"
          description="Safety invariants of this deployment flow."
        />
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>It never asks for a private key or recovery phrase: signing happens inside your wallet.</li>
          <li>It refuses to run if the connected wallet is not {EXPECTED_DEPLOYER}.</li>
          <li>It refuses to run on any chain except Arc Mainnet (5042).</li>
          <li>Bytecode is taken from the generated forge artifact, never typed in by hand.</li>
          <li>After deployment it verifies the receipt, deployed code, USDC() and nextLeaseId() == 1.</li>
        </ul>
      </Card>
    </div>
  )
}
