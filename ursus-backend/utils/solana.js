/**
 * Solana utility functions — replaces ethers.js helpers
 */
const { PublicKey } = require('@solana/web3.js');

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Validate a Solana address (base58, 32-44 chars)
 * Replaces ethers.isAddress()
 */
function isValidAddress(address) {
  if (!address || typeof address !== 'string') return false;
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format lamports to SOL (human-readable)
 * Replaces ethers.formatEther()
 */
function formatLamports(lamports) {
  if (lamports === null || lamports === undefined) return '0';
  const value = typeof lamports === 'string' ? parseInt(lamports, 10) : Number(lamports);
  if (isNaN(value)) return '0';
  return (value / LAMPORTS_PER_SOL).toString();
}

/**
 * Format token amount with arbitrary decimals
 * Replaces ethers.formatUnits()
 */
function formatTokenAmount(amount, decimals = 9) {
  if (amount === null || amount === undefined) return '0';
  const value = typeof amount === 'string' ? parseInt(amount, 10) : Number(amount);
  if (isNaN(value)) return '0';
  return (value / Math.pow(10, decimals)).toString();
}

/**
 * Parse SOL to lamports
 * Replaces ethers.parseEther()
 */
function parseSol(sol) {
  if (sol === null || sol === undefined) return 0;
  const value = typeof sol === 'string' ? parseFloat(sol) : Number(sol);
  if (isNaN(value)) return 0;
  return Math.floor(value * LAMPORTS_PER_SOL);
}

/**
 * Parse token amount with arbitrary decimals
 * Replaces ethers.parseUnits()
 */
function parseTokenAmount(amount, decimals = 9) {
  if (amount === null || amount === undefined) return 0;
  const value = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(value)) return 0;
  return Math.floor(value * Math.pow(10, decimals));
}

module.exports = {
  LAMPORTS_PER_SOL,
  isValidAddress,
  formatLamports,
  formatTokenAmount,
  parseSol,
  parseTokenAmount,
};
