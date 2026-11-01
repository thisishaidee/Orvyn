# Connect an AI agent to Orvynn

Orvynn exposes one narrow capability for an AI agent: prepare a proposed payment against a specific AgentPay lease. The agent may decide *when* a payment is appropriate, but Orvynn decides whether the request is allowed by reading Arc Mainnet state and simulating the exact contract call.

## Tool definition

The following function schema can be registered with an OpenAI-compatible tool-calling runtime:

```json
{
  "type": "function",
  "function": {
    "name": "prepare_orvynn_payment",
    "description": "Check and prepare a USDC payment request against an Orvynn lease on Arc Mainnet. This tool never signs or sends a transaction. The delegate must approve the returned payment separately in their wallet.",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "leaseId": {
          "type": "string",
          "description": "Positive decimal lease ID as a string.",
          "pattern": "^[1-9][0-9]*$"
        },
        "delegate": {
          "type": "string",
          "description": "The delegate wallet address registered on this lease."
        },
        "recipient": {
          "type": "string",
          "description": "Wallet address that should receive the USDC payment."
        },
        "amountUsdc": {
          "type": "string",
          "description": "Positive USDC amount with up to six decimal places.",
          "pattern": "^[0-9]+(\\.[0-9]{1,6})?$"
        },
        "purpose": {
          "type": "string",
          "description": "Short human-readable reason for the payment, up to 240 characters."
        }
      },
      "required": ["leaseId", "delegate", "recipient", "amountUsdc", "purpose"],
      "additionalProperties": false
    }
  }
}
```

## Tool execution

When the model calls `prepare_orvynn_payment`, the host application should make this request from a trusted server environment:

```ts
const response = await fetch(
  "https://YOUR_ORVYNN_AGENT_API/v1/payment-requests/prepare",
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.ORVYNN_AGENT_API_TOKEN}`
    },
    body: JSON.stringify(toolArguments)
  }
);

const result = await response.json();
```

Return the JSON result to the model as the tool result. The model should explain either the rejection reason or that the payment is ready for delegate approval. It must not claim that funds have been sent.

## Agent system instructions

Use instructions like these in the agent runtime:

- Never invent a lease ID, delegate address, recipient address or payment amount.
- Ask the user for missing payment details before calling the tool.
- Treat the API response as authoritative for whether a payment can be prepared.
- If the API returns `rejected`, explain the reason and do not suggest bypassing the lease.
- If the API returns `ready_for_delegate_approval`, show the amount, recipient, purpose and lease ID.
- Never tell the user that a payment is complete until the delegate wallet has submitted it and the app has observed a successful Arc transaction receipt.
- Never request, store or use the delegate's private key.

## Trust boundary

The API is a payment preflight tool, not an LLM or wallet. The AI runtime is responsible for interpreting the task and proposing payment details. Orvynn checks those details against live contract state. The delegate wallet is responsible for explicit signing. The AgentPay contract remains the final enforcement boundary.
