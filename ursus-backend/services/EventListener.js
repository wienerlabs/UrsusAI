/**
 * EventListener — Solana Proxy
 *
 * This module delegates to SolanaEventListener for backwards compatibility.
 * All EVM/Core DAO event listening code has been removed. New code should import
 * SolanaEventListener directly.
 */
const SolanaEventListener = require('./SolanaEventListener');

module.exports = SolanaEventListener;
