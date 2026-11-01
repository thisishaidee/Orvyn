# Orvynn Agent API

A restricted Arc Mainnet payment-request service for Orvynn AgentPay. It gives an AI agent a narrow capability: ask Orvynn whether a proposed lease payment is valid and receive a structured intent for the delegate wallet to review.

## Flow

1. An AI agent decides that a payment is needed and submits a structured request.
2. Orvynn reads the live lease and remaining allowance from Arc Mainnet.
3. Orvynn checks lease existence, delegate identity, revocation, expiry, allowlist, deposited balance and remaining allowance.
4. Orvynn simulates the exact `spend()` call.
5. If valid, the API returns a payment intent marked `ready_for_delegate_approval`.
6. The connected delegate wallet must separately review and sign the transaction. The smart contract enforces the rules again on-chain.

**The API never signs or submits a transaction.** It has no private key and cannot move funds.

## Run locally

```sh
npm install
npm run typecheck
npm test
npm run api
```

The API listens on `127.0.0.1:8787` by default.

- `GET /health`
- `POST /v1/payment-requests/prepare`

Example request:

```json
{
  "leaseId": "12",
  "delegate": "0x359db9b8af6e50b070cd73f4af91bbdf84ba81af",
  "recipient": "0x2222222222222222222222222222222222222222",
  "amountUsdc": "2.5",
  "purpose": "Pay for completed work"
}
```

Example successful response shape:

```json
{
  "status": "ready_for_delegate_approval",
  "purpose": "Pay for completed work",
  "payment": {
    "leaseId": "12",
    "delegate": "0x...",
    "recipient": "0x...",
    "amountUsdc": "2.5",
    "amountBaseUnits": "2500000",
    "remainingAllowanceUsdc": "20",
    "contract": "0x...",
    "chainId": 5042,
    "requiresDelegateWalletConfirmation": true
  },
  "execution": {
    "submitted": false,
    "signed": false,
    "requiresDelegateWalletConfirmation": true
  }
}
```

An invalid or disallowed payment returns HTTP 422 with `status: "rejected"` and a reason.

## Production safety

- Set a strong `AGENT_API_TOKEN` before exposing the service. Requests must send `Authorization: Bearer <token>`.
- The service refuses payment-preparation requests in production if no token is configured.
- Put the API behind HTTPS and platform-level rate limiting before public deployment.
- Never add a wallet private key to this service.
- No general-purpose token transfer, lease creation, deposit, revoke or withdrawal methods are exposed.
- The API is a payment preflight and intent service, not an LLM. An external AI agent can call it as a narrowly scoped tool after deciding what payment to request.
