import "dotenv/config";
import { alchemy, createAlchemySmartAccountClient } from "@account-kit/infra";
import { createLightAccount } from "@account-kit/smart-contracts";
import { LocalAccountSigner } from "@aa-sdk/core";
import type { Hex, Chain } from "viem";

const signingKey = (process.env.SIGNING_KEY || process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as Hex;
const providerApiKey = process.env.ALCHEMY_API_KEY || "oKxs-03sij-U_N0iOlrSsZFr29-IqbuF";
const gasPolicyId = process.env.ALCHEMY_GAS_POLICY_ID || "";

export async function getAccountKitClient(chain: Chain) {
  // Initialize transport inside the function to avoid module-load-time errors
  const alchemyTransport = alchemy({
    apiKey: providerApiKey,
  });

  return createAlchemySmartAccountClient({
    transport: alchemyTransport,
    policyId: gasPolicyId,
    chain,
    account: await createLightAccount({
      chain,
      transport: alchemyTransport,
      signer: LocalAccountSigner.privateKeyToAccountSigner(signingKey),
    }),
  });
}
