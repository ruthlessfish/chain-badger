"use client";

import { useAccount } from "wagmi";
import { CreateTemplateForm } from "~~/components/chainbadger/templates";

export default function CreateTemplatePage() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        {/* Hero */}
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Create a Badge</h1>
          <p className="text-base-content/60 max-w-md mx-auto">
            Design an on-chain achievement badge. Set requirements, supply cap, and metadata — then let your community
            earn it.
          </p>
        </div>

        {isConnected ? (
          <CreateTemplateForm />
        ) : (
          <div className="card bg-base-200 border border-base-300 shadow-sm">
            <div className="card-body items-center text-center gap-4 py-12">
              <span className="text-5xl">🔒</span>
              <p className="text-lg font-semibold">Connect your wallet</p>
              <p className="text-sm text-base-content/60">You need to connect a wallet to create a badge template.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
