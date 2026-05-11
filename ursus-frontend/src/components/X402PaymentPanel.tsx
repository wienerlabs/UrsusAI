import React, { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { CheckCircle2, AlertCircle, ExternalLink, Loader2, Settings, Wallet, Sparkles } from 'lucide-react';
import { X402Service } from '../services/x402Service';
import { SOLANA_PROGRAM_ADDRESSES } from '../config/contracts';
import idl from '../idl/agent_factory.json';
import type { X402Config } from '../types/x402';

// USDC has 6 decimals
const USDC_DECIMALS = 1_000_000;

interface X402PaymentPanelProps {
  agentAddress: string;
  agentName: string;
}

interface ServiceResult {
  service_id: string;
  agent_name: string;
  result: string;
  timestamp: string;
  paid?: boolean;
  error?: boolean;
  message?: string;
}

const SERVICE_OPTIONS = [
  { id: 'market_analysis', label: 'Market Analysis', description: 'Multi-coin technical analysis' },
  { id: 'trading_signal', label: 'Trading Signal', description: 'Real-time entry/exit signals' },
  { id: 'portfolio_advice', label: 'Portfolio Advice', description: 'Allocation recommendations' },
  { id: 'price_prediction', label: 'Price Prediction', description: '24h forecasts with confidence' },
];

export const X402PaymentPanel: React.FC<X402PaymentPanelProps> = ({
  agentAddress,
  agentName,
}) => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [x402Config, setX402Config] = useState<X402Config | null>(null);
  const [agentCreator, setAgentCreator] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [serviceResult, setServiceResult] = useState<ServiceResult | null>(null);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('0.01');
  const [serviceId, setServiceId] = useState('market_analysis');

  // Config form state
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configEnabled, setConfigEnabled] = useState(true);
  const [minPayment, setMinPayment] = useState('0.001');
  const [maxPayment, setMaxPayment] = useState('1.0');
  const [timeoutSeconds, setTimeoutSeconds] = useState('3600');

  const x402Service = new X402Service(connection, 'DEVNET');

  const loadX402Config = useCallback(async () => {
    try {
      setConfigLoading(true);

      // Fetch x402 config (may not exist yet)
      const config = await x402Service.getX402Config(agentAddress);
      setX402Config(config);

      // Also fetch agent creator on-chain (needed to decide owner even when no x402 config exists)
      try {
        const programId = new PublicKey(SOLANA_PROGRAM_ADDRESSES.DEVNET.PROGRAM_ID);
        const dummyWallet = {
          publicKey: new PublicKey('11111111111111111111111111111111'),
          signTransaction: async (tx: any) => tx,
          signAllTransactions: async (txs: any[]) => txs,
        };
        const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' });
        const program = new Program(idl as any, programId, provider);
        const agentPubkey = new PublicKey(agentAddress);
        const agentAccount: any = await program.account.agent.fetch(agentPubkey);
        setAgentCreator(agentAccount.creator.toBase58());
      } catch (creatorErr) {
        console.warn('Could not fetch agent creator on-chain:', creatorErr);
      }
    } catch (err) {
      console.error('Error loading X402 config:', err);
    } finally {
      setConfigLoading(false);
    }
  }, [agentAddress, connection]);

  useEffect(() => {
    loadX402Config();
  }, [loadX402Config]);

  // Auto-open configure form for owner when no x402 config exists yet
  useEffect(() => {
    if (!configLoading && !x402Config && wallet.publicKey && agentCreator) {
      if (wallet.publicKey.toBase58() === agentCreator) {
        setShowConfigForm(true);
      }
    }
  }, [configLoading, x402Config, wallet.publicKey, agentCreator]);

  // Check if current user is the agent owner (prefers x402 config recipient, falls back to agent creator)
  const isOwner = (() => {
    if (!wallet.publicKey) return false;
    const userAddr = wallet.publicKey.toBase58();
    if (x402Config?.paymentRecipient) {
      return userAddr === x402Config.paymentRecipient.toBase58();
    }
    if (agentCreator) {
      return userAddr === agentCreator;
    }
    return false;
  })();

  const handleConfigureX402 = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setTxSignature(null);

    try {
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      const signature = await x402Service.configureX402({
        agentAddress,
        enabled: configEnabled,
        minPaymentAmount: parseFloat(minPayment) * USDC_DECIMALS,
        maxPaymentAmount: parseFloat(maxPayment) * USDC_DECIMALS,
        serviceTimeoutSeconds: parseInt(timeoutSeconds),
      }, provider);

      setTxSignature(signature);
      setSuccess('X402 configured successfully');
      setShowConfigForm(false);
      await loadX402Config();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to configure X402';
      setError(message);
      console.error('Configure X402 error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayForService = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError('Please connect your wallet');
      return;
    }

    if (!x402Config?.enabled) {
      setError('X402 is not enabled for this agent');
      return;
    }

    const amountNum = parseFloat(paymentAmount);
    const minUsdc = x402Config.minPaymentAmount / USDC_DECIMALS;
    const maxUsdc = x402Config.maxPaymentAmount / USDC_DECIMALS;

    if (amountNum < minUsdc) {
      setError(`Amount must be at least ${minUsdc} USDC`);
      return;
    }
    if (amountNum > maxUsdc) {
      setError(`Amount must be at most ${maxUsdc} USDC`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setTxSignature(null);
    setServiceResult(null);

    try {
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      const amountLamports = Math.floor(amountNum * USDC_DECIMALS);

      // Step 1: Make on-chain payment
      const signature = await x402Service.payForService({
        agentAddress,
        amount: amountLamports,
        serviceId,
      }, provider);

      setTxSignature(signature);
      setSuccess('Payment confirmed on-chain. Fetching service result...');

      // Step 2: Call backend to get service result
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/agents/${agentAddress}/x402/service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-payment-signature': signature,
        },
        body: JSON.stringify({
          serviceId,
          paymentSignature: signature,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Service call failed: ${response.status}`);
      }

      const data = await response.json();
      const result = data.data || data;

      setServiceResult(result);
      setSuccess('Service delivered successfully');
      await loadX402Config();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      console.error('Payment error:', err);

      // If the error indicates the transaction was already processed,
      // it likely succeeded earlier — refresh the config to show the new state.
      if (message.includes('already processed') || message.includes('already been processed')) {
        setError('Previous payment is still being processed. Refreshing state...');
        await new Promise((r) => setTimeout(r, 2000));
        await loadX402Config();
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (configLoading) {
    return (
      <div className="bg-surface-card border border-border rounded-xl p-8 text-center shadow-card">
        <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto mb-2" />
        <p className="text-content-muted text-body-sm">Loading X402 configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-card border border-border rounded-xl p-6 shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-subtle border border-accent-muted flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <h2 className="text-heading-md text-content-primary">X402 Payment Protocol</h2>
            <p className="text-body-sm text-content-muted mt-1">
              Pay per use for premium agent services on-chain with USDC.
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-5 pt-5 border-t border-border-subtle">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  x402Config?.enabled ? 'bg-success' : 'bg-content-subtle'
                }`}
              />
              <span className="text-caption uppercase text-content-muted">Status</span>
              <span
                className={`text-body-sm font-semibold ${
                  x402Config?.enabled ? 'text-success' : 'text-content-muted'
                }`}
              >
                {x402Config ? (x402Config.enabled ? 'Enabled' : 'Disabled') : 'Not configured'}
              </span>
            </div>
            {isOwner && (
              <button
                onClick={() => setShowConfigForm(!showConfigForm)}
                className="inline-flex items-center gap-1.5 text-body-sm text-accent hover:text-content-primary transition-colors duration-base"
              >
                <Settings size={14} />
                {showConfigForm ? 'Hide settings' : x402Config ? 'Update settings' : 'Configure'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {x402Config && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface-card border border-border rounded-lg p-4">
            <div className="text-micro uppercase text-content-muted mb-1">Min Payment</div>
            <div className="text-body font-semibold text-content-primary">
              {(x402Config.minPaymentAmount / USDC_DECIMALS).toFixed(4)} <span className="text-caption text-content-muted">USDC</span>
            </div>
          </div>
          <div className="bg-surface-card border border-border rounded-lg p-4">
            <div className="text-micro uppercase text-content-muted mb-1">Max Payment</div>
            <div className="text-body font-semibold text-content-primary">
              {(x402Config.maxPaymentAmount / USDC_DECIMALS).toFixed(4)} <span className="text-caption text-content-muted">USDC</span>
            </div>
          </div>
          <div className="bg-surface-card border border-border rounded-lg p-4">
            <div className="text-micro uppercase text-content-muted mb-1">Total Earned</div>
            <div className="text-body font-semibold text-content-primary">
              {(x402Config.totalPaymentsReceived / USDC_DECIMALS).toFixed(4)} <span className="text-caption text-content-muted">USDC</span>
            </div>
          </div>
          <div className="bg-surface-card border border-border rounded-lg p-4">
            <div className="text-micro uppercase text-content-muted mb-1">Service Calls</div>
            <div className="text-body font-semibold text-content-primary">
              {x402Config.totalServiceCalls}
            </div>
          </div>
        </div>
      )}

      {/* Configure form (owner only) */}
      {showConfigForm && isOwner && (
        <div className="bg-surface-card border border-border rounded-xl p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
            <Settings className="w-4 h-4 text-accent" />
            <h3 className="text-heading-sm text-content-primary">X402 Settings</h3>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={configEnabled}
              onChange={(e) => setConfigEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-surface-elevated accent-accent"
            />
            <span className="text-body text-content-primary">Enable x402 payments</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption uppercase text-content-muted mb-2">
                Min Payment (USDC)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={minPayment}
                onChange={(e) => setMinPayment(e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-md text-body text-content-primary placeholder:text-content-subtle focus:outline-none focus:border-border-focus transition-colors duration-base"
              />
            </div>
            <div>
              <label className="block text-caption uppercase text-content-muted mb-2">
                Max Payment (USDC)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={maxPayment}
                onChange={(e) => setMaxPayment(e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-md text-body text-content-primary placeholder:text-content-subtle focus:outline-none focus:border-border-focus transition-colors duration-base"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-caption uppercase text-content-muted mb-2">
                Timeout (seconds)
              </label>
              <input
                type="number"
                min="60"
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-md text-body text-content-primary placeholder:text-content-subtle focus:outline-none focus:border-border-focus transition-colors duration-base"
              />
            </div>
          </div>

          <button
            onClick={handleConfigureX402}
            disabled={loading || !wallet.connected}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-content-inverse font-semibold py-2.5 px-4 rounded-md text-body-sm transition-colors duration-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Configuring...
              </>
            ) : (
              <>
                <Settings size={14} />
                Save Configuration
              </>
            )}
          </button>
        </div>
      )}

      {/* Pay for service form */}
      {x402Config?.enabled && (
        <div className="bg-surface-card border border-border rounded-xl p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
            <Wallet className="w-4 h-4 text-accent" />
            <h3 className="text-heading-sm text-content-primary">Pay for Service</h3>
          </div>

          {/* Service selection */}
          <div>
            <label className="block text-caption uppercase text-content-muted mb-2">
              Select service
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SERVICE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setServiceId(opt.id)}
                  className={`p-3 rounded-md border text-left transition-colors duration-base ${
                    serviceId === opt.id
                      ? 'bg-accent-subtle border-accent-muted'
                      : 'bg-surface-elevated border-border hover:border-border-strong'
                  }`}
                >
                  <div
                    className={`text-body-sm font-semibold ${
                      serviceId === opt.id ? 'text-accent' : 'text-content-primary'
                    }`}
                  >
                    {opt.label}
                  </div>
                  <div className="text-caption text-content-muted mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-caption uppercase text-content-muted mb-2">
              Payment amount (USDC)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min={x402Config.minPaymentAmount / USDC_DECIMALS}
                max={x402Config.maxPaymentAmount / USDC_DECIMALS}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-lg text-heading-sm font-semibold text-content-primary placeholder:text-content-subtle focus:outline-none focus:border-border-focus transition-colors duration-base"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-caption text-content-muted font-medium">
                USDC
              </div>
            </div>
            <div className="text-micro text-content-subtle mt-1.5">
              Min: {(x402Config.minPaymentAmount / USDC_DECIMALS).toFixed(4)} · Max: {(x402Config.maxPaymentAmount / USDC_DECIMALS).toFixed(4)}
            </div>
          </div>

          <button
            onClick={handlePayForService}
            disabled={loading || !wallet.connected}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-content-inverse font-semibold py-3 px-4 rounded-md text-body-sm transition-colors duration-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing payment...
              </>
            ) : (
              <>
                <Wallet size={14} />
                Pay & Execute Service
              </>
            )}
          </button>
        </div>
      )}

      {/* Not configured — different messages for owner vs visitor */}
      {!x402Config && !showConfigForm && !isOwner && (
        <div className="bg-surface-card border border-border rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-5 h-5 text-content-muted" />
          </div>
          <h3 className="text-heading-sm text-content-primary mb-1">Not Available</h3>
          <p className="text-body-sm text-content-muted">
            This agent has not configured x402 paid services yet.
          </p>
        </div>
      )}

      {/* Config exists but disabled — non-owner view */}
      {x402Config && !x402Config.enabled && !isOwner && (
        <div className="bg-surface-card border border-border rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-5 h-5 text-content-muted" />
          </div>
          <h3 className="text-heading-sm text-content-primary mb-1">Currently Disabled</h3>
          <p className="text-body-sm text-content-muted">
            The owner has temporarily disabled x402 paid services.
          </p>
        </div>
      )}

      {/* Wallet not connected warning */}
      {!wallet.connected && (
        <div className="bg-warning-subtle border border-warning-muted rounded-md p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-body-sm text-warning">
            Connect your Solana wallet to use x402 payments.
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-danger-subtle border border-danger-muted rounded-md p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-body-sm text-danger break-words">{error}</div>
        </div>
      )}

      {/* Success + TX link */}
      {success && txSignature && (
        <div className="bg-success-subtle border border-success-muted rounded-md p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-body-sm text-success font-semibold">{success}</div>
              <a
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-caption text-accent hover:text-content-primary font-mono transition-colors duration-base"
              >
                {txSignature.slice(0, 12)}...{txSignature.slice(-12)}
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Service result */}
      {serviceResult && !serviceResult.error && (
        <div className="bg-surface-card border border-border rounded-xl p-6 shadow-card">
          <div className="flex items-center gap-2 pb-3 border-b border-border-subtle mb-4">
            <Sparkles className="w-4 h-4 text-accent" />
            <h3 className="text-heading-sm text-content-primary">
              {SERVICE_OPTIONS.find(o => o.id === serviceResult.service_id)?.label || serviceResult.service_id}
            </h3>
          </div>
          <div className="bg-surface border border-border-subtle rounded-md p-4 max-h-96 overflow-y-auto">
            <pre className="text-body-sm text-content-secondary whitespace-pre-wrap font-sans leading-relaxed">
              {typeof serviceResult.result === 'string'
                ? serviceResult.result
                : JSON.stringify(serviceResult.result, null, 2)}
            </pre>
          </div>
          <div className="text-caption text-content-subtle mt-3 flex items-center justify-between">
            <span>by {serviceResult.agent_name || agentName}</span>
            <span>{new Date(serviceResult.timestamp).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
