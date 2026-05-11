/**
 * BlockchainService — Solana Proxy
 *
 * This module delegates to SolanaBlockchainService for backwards compatibility.
 * All EVM/Core DAO code has been removed. New code should import
 * SolanaBlockchainService directly.
 */
const SolanaBlockchainService = require('./SolanaBlockchainService');

module.exports = SolanaBlockchainService;
