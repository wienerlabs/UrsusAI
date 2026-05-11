// Utility helpers for the profile page (formatting, wallets, social links).

export function truncateWallet(addr: string | null | undefined, head = 4, tail = 4): string {
  if (!addr) return '';
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '$0.00';
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Format a SOL amount with human-readable precision. Always SOL, never
// scientific notation. Tiny values use up to 9 decimals (Solana's native
// precision) so dust values stay legible without unit switching.
export function formatSol(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '0 SOL';
  const n = Number(value);
  if (n === 0) return '0 SOL';

  const abs = Math.abs(n);

  // Magnitude-aware decimal precision. Never scientific notation.
  let decimals: number;
  if (abs >= 1000) decimals = 2;
  else if (abs >= 1) decimals = 3;
  else if (abs >= 0.0001) decimals = 4;
  else decimals = 9; // dust-level precision

  const fixed = n.toFixed(decimals);
  // Guard against values so small they round to zero at 9 decimals.
  if (Number(fixed) === 0) return '0 SOL';

  return `${fixed} SOL`;
}

// Signed variant for PnL / delta displays — prefixes positive values with "+".
export function formatSignedSol(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '0 SOL';
  const n = Number(value);
  if (n === 0) return '0 SOL';

  const formatted = formatSol(Math.abs(n));
  if (formatted === '0 SOL') return '0 SOL';
  return n > 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '0';
  const n = Number(value);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString();
}

export function formatRelativeTime(input: string | number | Date | null | undefined): string {
  if (!input) return '';
  const t = new Date(input).getTime();
  if (!Number.isFinite(t)) return '';
  const seconds = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(input).toLocaleDateString();
}

export function formatJoinDate(input: string | number | Date | null | undefined): string {
  if (!input) return '—';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

// Normalize a user-entered social handle/URL into a canonical URL or ''.
export function normalizeSocialUrl(
  kind: 'twitter' | 'discord' | 'telegram' | 'github' | 'website',
  value: string | null | undefined
): string {
  let v = (value || '').trim();
  if (!v) return '';
  if (v.startsWith('@')) v = v.slice(1);
  if (/^https?:\/\//i.test(v)) return v;
  switch (kind) {
    case 'twitter':
      return `https://twitter.com/${v}`;
    case 'discord':
      // Discord usernames have no canonical public URL; treat plain value as invite.
      return v.includes('/') ? `https://${v}` : `https://discord.gg/${v}`;
    case 'telegram':
      return `https://t.me/${v}`;
    case 'github':
      return `https://github.com/${v}`;
    case 'website':
      return `https://${v.replace(/^\/+/, '')}`;
  }
}

// Extract the short form of a social URL for input prefills.
export function extractSocialHandle(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    return url;
  }
}

// Copy text to the clipboard with a graceful fallback.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  } catch {
    return false;
  }
}

// Wallet comparison that tolerates case differences (Solana base58 mixed case).
export function sameWallet(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}
