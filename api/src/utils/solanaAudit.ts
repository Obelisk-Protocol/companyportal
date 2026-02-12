/**
 * On-chain audit for a Solana wallet: aggregate inbound/outbound SOL, SOL balance, and USDC balance.
 * Requires @solana/web3.js. If not installed, runAudit returns { error: 'Solana RPC not configured' }.
 */

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const MAX_SIGNATURES = 500; // Limit per audit to avoid timeouts
// USDC mint on Solana mainnet (Circle)
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export interface AuditResult {
  totalInbound: number;
  totalOutbound: number;
  balanceAtAudit: number | null; // SOL
  balanceUsdc: number | null;
  transactionCount: number;
  error?: string;
  rawData?: { signatures: string[] };
}

export async function runWalletAudit(walletAddress: string): Promise<AuditResult> {
  try {
    // Dynamic import so API starts even if @solana/web3.js is not installed
    const { Connection, PublicKey } = await import('@solana/web3.js');
    const connection = new Connection(SOLANA_RPC, 'confirmed');
    const pubkey = new PublicKey(walletAddress);

    const [signatures, balance, tokenAccounts] = await Promise.all([
      connection.getSignaturesForAddress(pubkey, { limit: MAX_SIGNATURES }),
      connection.getBalance(pubkey).catch(() => 0),
      connection.getParsedTokenAccountsByOwner(pubkey, { mint: new PublicKey(USDC_MINT) }).catch(() => ({ value: [] })),
    ]);

    let totalInbound = 0;
    let totalOutbound = 0;
    const lamportsPerSol = 1e9;

    // Fetch transactions to compute inbound/outbound from balance deltas
    for (const sig of signatures) {
      try {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed',
        });
        if (!tx?.meta?.preBalances?.length) continue;

        const msg = (tx as any).transaction?.message;
        const accountKeys: string[] = msg?.accountKeys
          ? msg.accountKeys.map((k: any) => (typeof k === 'string' ? k : k?.toBase58?.() ?? k?.toString?.() ?? ''))
          : msg?.staticAccountKeys ?? [];
        const walletIndex = accountKeys.indexOf(walletAddress);
        if (walletIndex === -1) continue;

        const pre = tx.meta.preBalances[walletIndex] ?? 0;
        const post = tx.meta.postBalances[walletIndex] ?? 0;
        const delta = (post - pre) / lamportsPerSol;
        if (delta > 0) totalInbound += delta;
        else totalOutbound += Math.abs(delta);
      } catch {
        // Skip failed tx fetch/parse
      }
    }

    // USDC balance: sum of parsed USDC token accounts (usually one)
    let balanceUsdc: number | null = null;
    if (tokenAccounts?.value?.length) {
      balanceUsdc = tokenAccounts.value.reduce((sum: number, acc: any) => {
        const info = acc?.account?.data?.parsed?.info;
        const amount = info?.tokenAmount?.uiAmount ?? (info?.tokenAmount?.amount ? Number(info.tokenAmount.amount) / Math.pow(10, info.tokenAmount.decimals || 6) : 0);
        return sum + amount;
      }, 0);
      balanceUsdc = Math.round(balanceUsdc * 1e6) / 1e6;
    }

    return {
      totalInbound: Math.round(totalInbound * 1e9) / 1e9,
      totalOutbound: Math.round(totalOutbound * 1e9) / 1e9,
      balanceAtAudit: balance / lamportsPerSol,
      balanceUsdc,
      transactionCount: signatures.length,
      rawData: { signatures: signatures.slice(0, 100).map((s) => s.signature) },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Cannot find module') || message.includes('@solana/web3.js')) {
    return {
      totalInbound: 0,
      totalOutbound: 0,
      balanceAtAudit: null,
      balanceUsdc: null,
      transactionCount: 0,
      error: 'Solana RPC not configured. Install @solana/web3.js and set SOLANA_RPC_URL if needed.',
    };
  }
  return {
    totalInbound: 0,
    totalOutbound: 0,
    balanceAtAudit: null,
    balanceUsdc: null,
    transactionCount: 0,
    error: message,
  };
}
}
