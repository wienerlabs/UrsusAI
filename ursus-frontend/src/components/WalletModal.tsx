import React, { useState } from 'react';
import { X, Wallet, ExternalLink, Copy, CheckCircle, Loader2 } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { shortenAddress, getExplorerUrl, SOLANA_NETWORK } from '../config/solana';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const {
    isConnected,
    address,
    balance,
    chain,
    connect,
    disconnect,
  } = useWallet();

  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-border rounded-xl shadow-elevated max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <h2 className="text-heading-md text-content-primary">
            {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
          </h2>
          <button
            onClick={onClose}
            className="text-content-muted hover:text-content-primary transition-colors duration-base"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {!isConnected ? (
            /* Connection Options */
            <div className="space-y-4">
              <p className="text-body-sm text-content-secondary mb-6">
                Connect your Solana wallet to start creating and trading AI agents.
              </p>

              {/* Phantom */}
              <button
                onClick={handleConnect}
                className="w-full flex items-center gap-4 p-4 bg-surface-elevated border border-border rounded-lg hover:bg-surface-hover transition-colors duration-base"
              >
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <Wallet size={20} className="text-content-inverse" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-body text-content-primary">Connect Wallet</div>
                  <div className="text-caption text-content-muted">Phantom, Solflare, or other Solana wallet</div>
                </div>
              </button>

              <div className="text-center text-micro text-content-subtle mt-6">
                By connecting your wallet, you agree to our Terms of Service and Privacy Policy.
              </div>
            </div>
          ) : (
            /* Connected Wallet Info */
            <div className="space-y-6">
              {/* Network Status */}
              <div className="p-4 bg-success-subtle border border-border-subtle rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-success" />
                  <span className="text-body-sm text-success">
                    Connected to {chain?.name || 'Solana'}
                  </span>
                </div>
              </div>

              {/* Wallet Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-caption text-content-muted uppercase mb-2">Wallet Address</label>
                  <div className="flex items-center gap-2 p-3 bg-surface-elevated border border-border rounded-lg">
                    <span className="text-content-primary font-mono text-body-sm flex-1">
                      {address ? shortenAddress(address, 6) : ''}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="text-content-muted hover:text-content-primary transition-colors duration-base"
                    >
                      {copied ? <CheckCircle size={16} className="text-success" /> : <Copy size={16} />}
                    </button>
                    {address && (
                      <a
                        href={getExplorerUrl('address', address, SOLANA_NETWORK)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-content-muted hover:text-content-primary transition-colors duration-base"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-caption text-content-muted uppercase mb-2">Balance</label>
                  <div className="p-3 bg-surface-elevated border border-border rounded-lg">
                    <span className="text-body text-content-primary">
                      {balance ? `${balance.formatted} ${balance.symbol}` : '0.0000 SOL'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-caption text-content-muted uppercase mb-2">Network</label>
                  <div className="p-3 bg-surface-elevated border border-border rounded-lg">
                    <span className="text-body text-content-primary">
                      {chain?.name || 'Solana'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleDisconnect}
                  className="flex-1 bg-danger-subtle border border-border-subtle text-danger px-4 py-2 rounded-lg text-body-sm hover:bg-surface-hover transition-colors duration-base"
                >
                  Disconnect
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-accent hover:bg-accent-hover text-content-inverse px-4 py-2 rounded-lg text-body-sm transition-colors duration-base"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
