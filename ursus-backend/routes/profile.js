const express = require('express');
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const Agent = require('../models/Agent');
const Trade = require('../models/Trade');
const Portfolio = require('../models/Portfolio');

const router = express.Router();

// ---- Solana wallet validator (base58, 32-44 chars, alphanumeric) ----
function isSolanaAddress(address) {
  if (!address || address.length < 32 || address.length > 44) return false;
  if (/^[0-9a-fA-F]{24}$/.test(address)) return false; // not a Mongo ObjectId
  return /^[a-zA-Z0-9]+$/.test(address);
}

const validateSolanaAddress = (value) => {
  if (!isSolanaAddress(value)) throw new Error('Invalid Solana address');
  return true;
};

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Build a serializable view of a User document
function serializeUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    walletAddress: user.walletAddress,
    username: user.username || null,
    email: user.email || null,
    avatar: user.avatar || null,
    bio: user.bio || '',
    socialLinks: {
      twitter: user.socialLinks?.twitter || '',
      discord: user.socialLinks?.discord || '',
      telegram: user.socialLinks?.telegram || '',
      website: user.socialLinks?.website || ''
    },
    preferences: {
      theme: user.preferences?.theme || 'dark',
      notifications: {
        email: user.preferences?.notifications?.email ?? true,
        push: user.preferences?.notifications?.push ?? true,
        trading: user.preferences?.notifications?.trading ?? true,
        agents: user.preferences?.notifications?.agents ?? true
      },
      privacy: {
        showPortfolio: user.preferences?.privacy?.showPortfolio ?? false,
        showActivity: user.preferences?.privacy?.showActivity ?? true
      }
    },
    isVerified: !!user.isVerified,
    verificationLevel: user.verificationLevel || 'none',
    reputation: user.reputation || { score: 0, level: 'Newcomer', badges: [] },
    tradingStats: user.tradingStats || {
      totalTrades: 0,
      totalVolume: 0,
      winRate: 0,
      bestTrade: 0,
      worstTrade: 0
    },
    socialStats: user.socialStats || {
      followingCount: 0,
      followersCount: 0,
      commentsCount: 0,
      likesReceived: 0,
      reputation: 0
    },
    profileExtended: user.profileExtended || {},
    totalPortfolioValue: user.totalPortfolioValue || 0,
    totalPnL: user.totalPnL || 0,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  };
}

// ---- GET /api/profile/:wallet ----
// Returns the profile, auto-creating a lightweight row on first access.
router.get('/:wallet',
  [param('wallet').custom(validateSolanaAddress)],
  validateRequest,
  async (req, res) => {
    try {
      const wallet = req.params.wallet;
      let user = await User.findByWallet(wallet);
      if (!user) {
        user = await User.create({ walletAddress: wallet });
      }
      res.json({ success: true, data: serializeUser(user) });
    } catch (error) {
      console.error('profile:get error', error);
      res.status(500).json({ success: false, error: 'Failed to load profile' });
    }
  }
);

// ---- PUT /api/profile/:wallet ----
// Body: { username?, email?, bio?, avatar?, socialLinks?, preferences?, displayName? }
// NOTE: Solana signature-based auth should be added for production use.
router.put('/:wallet',
  [
    param('wallet').custom(validateSolanaAddress),
    body('username').optional({ nullable: true }).isString().trim()
      .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 chars'),
    body('email').optional({ nullable: true }).isString().trim()
      .custom((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      .withMessage('Invalid email'),
    body('bio').optional({ nullable: true }).isString()
      .isLength({ max: 500 }).withMessage('Bio must be <= 500 chars'),
    body('avatar').optional({ nullable: true }).isString()
      .isLength({ max: 2048 }).withMessage('Avatar URL too long'),
    body('socialLinks').optional().isObject(),
    body('preferences').optional().isObject(),
    body('displayName').optional({ nullable: true }).isString().trim()
      .isLength({ max: 50 }).withMessage('Display name must be <= 50 chars')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const wallet = req.params.wallet;
      const { username, email, bio, avatar, socialLinks, preferences, displayName } = req.body;

      let user = await User.findByWallet(wallet);
      if (!user) {
        user = new User({ walletAddress: wallet });
      }

      // Username uniqueness
      if (typeof username === 'string' && username && username !== user.username) {
        const existing = await User.findByUsername(username);
        if (existing && !existing._id.equals(user._id)) {
          return res.status(409).json({ success: false, error: 'Username already taken' });
        }
        user.username = username;
      }

      // Email uniqueness
      if (typeof email === 'string' && email !== user.email) {
        if (email === '') {
          user.email = undefined;
        } else {
          const existing = await User.findOne({ email: email.toLowerCase() });
          if (existing && !existing._id.equals(user._id)) {
            return res.status(409).json({ success: false, error: 'Email already taken' });
          }
          user.email = email.toLowerCase();
        }
      }

      if (typeof bio === 'string') user.bio = bio;
      if (typeof avatar === 'string') user.avatar = avatar || null;

      if (socialLinks && typeof socialLinks === 'object') {
        user.socialLinks = {
          ...(user.socialLinks || {}),
          ...socialLinks
        };
      }

      if (preferences && typeof preferences === 'object') {
        user.preferences = {
          ...(user.preferences?.toObject?.() || user.preferences || {}),
          ...preferences,
          notifications: {
            ...(user.preferences?.notifications?.toObject?.() || user.preferences?.notifications || {}),
            ...(preferences.notifications || {})
          },
          privacy: {
            ...(user.preferences?.privacy?.toObject?.() || user.preferences?.privacy || {}),
            ...(preferences.privacy || {})
          }
        };
      }

      if (typeof displayName === 'string') {
        user.profileExtended = {
          ...(user.profileExtended?.toObject?.() || user.profileExtended || {}),
          displayName
        };
      }

      await user.save();
      res.json({ success: true, data: serializeUser(user) });
    } catch (error) {
      console.error('profile:put error', error);
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, error: 'Duplicate field (username or email already in use)' });
      }
      res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
  }
);

// ---- GET /api/profile/:wallet/stats ----
// Aggregates: agents created, portfolio value/PnL, trades, holdings.
router.get('/:wallet/stats',
  [param('wallet').custom(validateSolanaAddress)],
  validateRequest,
  async (req, res) => {
    try {
      const wallet = req.params.wallet;
      const walletLower = wallet.toLowerCase();

      const [user, agentsCreated, tradeAgg, portfolioAgg] = await Promise.all([
        User.findByWallet(wallet),
        Agent.countDocuments({ creator: walletLower, isActive: true }),
        Trade.aggregate([
          { $match: { trader: walletLower } },
          {
            $group: {
              _id: null,
              totalTrades: { $sum: 1 },
              totalVolumeSol: { $sum: { $toDouble: { $ifNull: ['$coreAmount', 0] } } },
              totalVolumeUsd: { $sum: { $toDouble: { $ifNull: ['$priceUsd', 0] } } },
              buys: { $sum: { $cond: [{ $eq: ['$type', 'buy'] }, 1, 0] } },
              sells: { $sum: { $cond: [{ $eq: ['$type', 'sell'] }, 1, 0] } }
            }
          }
        ]),
        Portfolio.aggregate([
          { $match: { userAddress: walletLower, isActive: true } },
          {
            $group: {
              _id: null,
              positionCount: { $sum: 1 },
              totalValue: { $sum: { $toDouble: { $ifNull: ['$currentValue', 0] } } },
              totalInvested: { $sum: { $toDouble: { $ifNull: ['$totalInvested', 0] } } }
            }
          }
        ])
      ]);

      const trade = tradeAgg[0] || { totalTrades: 0, totalVolumeSol: 0, totalVolumeUsd: 0, buys: 0, sells: 0 };
      const port = portfolioAgg[0] || { positionCount: 0, totalValue: 0, totalInvested: 0 };
      const pnl = port.totalValue - port.totalInvested;
      const pnlPct = port.totalInvested > 0 ? (pnl / port.totalInvested) * 100 : 0;

      res.json({
        success: true,
        data: {
          agentsCreated,
          trading: {
            totalTrades: trade.totalTrades,
            totalVolumeSol: trade.totalVolumeSol,
            totalVolumeUsd: trade.totalVolumeUsd,
            buys: trade.buys,
            sells: trade.sells,
            winRate: user?.tradingStats?.winRate || 0
          },
          portfolio: {
            positionCount: port.positionCount,
            totalValue: port.totalValue,
            totalInvested: port.totalInvested,
            pnl,
            pnlPct
          },
          reputation: user?.reputation || { score: 0, level: 'Newcomer', badges: [] },
          social: user?.socialStats || {
            followingCount: 0,
            followersCount: 0,
            commentsCount: 0,
            likesReceived: 0
          },
          joinedAt: user?.createdAt || null
        }
      });
    } catch (error) {
      console.error('profile:stats error', error);
      res.status(500).json({ success: false, error: 'Failed to load profile stats' });
    }
  }
);

// ---- GET /api/profile/:wallet/portfolio ----
// Returns portfolio positions per agent, reconstructed from Trade history so
// that closed positions and partially-filled holdings both surface. Falls back
// to the Portfolio collection when trades are missing. Includes realized PnL,
// unrealized PnL (when still holding), and live market data per row.
router.get('/:wallet/portfolio',
  [param('wallet').custom(validateSolanaAddress)],
  validateRequest,
  async (req, res) => {
    try {
      const wallet = req.params.wallet;
      const walletLower = wallet.toLowerCase();

      // 1. Aggregate trades per agent address — the authoritative source of
      //    positions even when the Portfolio collection isn't populated.
      const tradeAgg = await Trade.aggregate([
        { $match: { trader: walletLower } },
        {
          $group: {
            _id: '$agentAddress',
            buys: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'buy'] },
                  { $toDouble: { $ifNull: ['$coreAmount', 0] } },
                  0
                ]
              }
            },
            sells: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'sell'] },
                  { $toDouble: { $ifNull: ['$coreAmount', 0] } },
                  0
                ]
              }
            },
            tokensBought: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'buy'] },
                  { $toDouble: { $ifNull: ['$tokenAmount', 0] } },
                  0
                ]
              }
            },
            tokensSold: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'sell'] },
                  { $toDouble: { $ifNull: ['$tokenAmount', 0] } },
                  0
                ]
              }
            },
            buyCount: { $sum: { $cond: [{ $eq: ['$type', 'buy'] }, 1, 0] } },
            sellCount: { $sum: { $cond: [{ $eq: ['$type', 'sell'] }, 1, 0] } },
            lastTradeAt: { $max: '$timestamp' },
            firstTradeAt: { $min: '$timestamp' }
          }
        }
      ]);

      // 2. Look up agent metadata for each traded address (case-insensitive).
      const agentAddresses = tradeAgg.map((t) => t._id).filter(Boolean);
      const agentRegexes = agentAddresses.map((a) => new RegExp(`^${a}$`, 'i'));
      const agents = agentAddresses.length
        ? await Agent.find({ contractAddress: { $in: agentRegexes } }).lean()
        : [];
      const agentByKey = new Map();
      for (const a of agents) {
        agentByKey.set(String(a.contractAddress || '').toLowerCase(), a);
      }

      // 3. Also read Portfolio records to get any richer per-position state.
      const portfolioRecords = await Portfolio.find({ userAddress: walletLower }).lean();
      const portfolioByAddr = new Map();
      for (const p of portfolioRecords) {
        portfolioByAddr.set(String(p.agentAddress || '').toLowerCase(), p);
      }

      // 4. Shape each agent into a portfolio row.
      const rows = tradeAgg.map((t) => {
        const addr = String(t._id || '').toLowerCase();
        const agent = agentByKey.get(addr) || {};
        const port = portfolioByAddr.get(addr) || {};

        const currentPrice = Number(agent?.tokenomics?.currentPrice || 0);
        const priceChange24h = Number(agent?.metrics?.priceChange24h || 0);
        const volume24hSol = Number(agent?.metrics?.volume24h || 0);

        // Current token balance: trust Portfolio record when present,
        // otherwise compute from trade deltas.
        const tradeBalance = Math.max(0, Number(t.tokensBought || 0) - Number(t.tokensSold || 0));
        const portBalance = Number(port.balance || 0);
        const holdings = portBalance > 0 ? portBalance : tradeBalance;

        const totalInvestedSol = Number(t.buys || 0);
        const totalRealizedSol = Number(t.sells || 0);

        // Current market value of remaining holdings (SOL).
        const currentValueSol = holdings > 0 && currentPrice > 0
          ? holdings * currentPrice
          : 0;

        // Unrealized PnL = value of what you still hold minus what you paid
        //                  for that remaining portion (approx, uses average).
        const totalTokensBought = Number(t.tokensBought || 0);
        const costBasisRemaining = totalTokensBought > 0
          ? totalInvestedSol * (holdings / totalTokensBought)
          : 0;
        const unrealizedPnLSol = currentValueSol - costBasisRemaining;

        // Realized PnL = sell revenue minus cost basis of sold portion.
        const tokensSold = Number(t.tokensSold || 0);
        const costBasisSold = totalTokensBought > 0
          ? totalInvestedSol * (tokensSold / totalTokensBought)
          : 0;
        const realizedPnLSol = totalRealizedSol - costBasisSold;

        const totalPnLSol = realizedPnLSol + unrealizedPnLSol;
        const pnlPct = totalInvestedSol > 0
          ? (totalPnLSol / totalInvestedSol) * 100
          : 0;

        const status = holdings > 0 ? 'open' : 'closed';

        return {
          agentAddress: agent.contractAddress || t._id,
          token: agent.name || 'AI Agent',
          symbol: agent.symbol || 'AGT',
          icon: agent.image || agent.avatar || '',
          status,
          holdings,
          price: currentPrice,
          value: currentValueSol,
          change24h: priceChange24h,
          volume24h: volume24hSol,
          totalInvested: totalInvestedSol,
          totalRealized: totalRealizedSol,
          unrealizedPnL: unrealizedPnLSol,
          realizedPnL: realizedPnLSol,
          totalPnL: totalPnLSol,
          pnlPct,
          buyCount: Number(t.buyCount || 0),
          sellCount: Number(t.sellCount || 0),
          firstTradeAt: t.firstTradeAt,
          lastTradeAt: t.lastTradeAt,
        };
      });

      // Sort: open positions first (by value), then closed (by last trade).
      rows.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
        if (a.status === 'open') return b.value - a.value;
        return new Date(b.lastTradeAt).getTime() - new Date(a.lastTradeAt).getTime();
      });

      const totalValue = rows.reduce((sum, r) => sum + (r.value || 0), 0);
      const totalRealized = rows.reduce((sum, r) => sum + (r.realizedPnL || 0), 0);
      const totalUnrealized = rows.reduce((sum, r) => sum + (r.unrealizedPnL || 0), 0);

      res.json({
        success: true,
        data: {
          rows,
          totalValue,
          totalRealized,
          totalUnrealized,
          totalPnL: totalRealized + totalUnrealized
        }
      });
    } catch (error) {
      console.error('profile:portfolio error', error);
      res.status(500).json({ success: false, error: 'Failed to load portfolio' });
    }
  }
);

// ---- GET /api/profile/:wallet/activity ----
// Unified activity feed: agents created + trades (recent first).
router.get('/:wallet/activity',
  [param('wallet').custom(validateSolanaAddress)],
  validateRequest,
  async (req, res) => {
    try {
      const wallet = req.params.wallet;
      const walletLower = wallet.toLowerCase();
      const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);

      const [agents, trades] = await Promise.all([
        Agent.find({ creator: walletLower })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select('name symbol contractAddress createdAt')
          .lean(),
        Trade.find({ trader: walletLower })
          .sort({ timestamp: -1 })
          .limit(limit)
          .select('agentAddress type coreAmount tokenAmount priceUsd timestamp transactionHash')
          .lean()
      ]);

      const items = [];

      for (const ag of agents) {
        items.push({
          id: `created-${ag.contractAddress}`,
          type: 'created',
          message: `Created ${ag.name || ag.symbol || 'AI'} agent`,
          amount: null,
          timestamp: ag.createdAt ? new Date(ag.createdAt).toISOString() : new Date().toISOString(),
          meta: { agentAddress: ag.contractAddress, symbol: ag.symbol }
        });
      }

      for (const tx of trades) {
        const tokenAmt = Number(tx.tokenAmount || 0);
        const solAmt = Number(tx.coreAmount || 0);
        const pricePerToken = Number(tx.priceUsd || 0);
        // Prefer tokenAmount * priceUsd for USD value when price is set,
        // otherwise surface the SOL amount as the primary value.
        const usdValue = pricePerToken > 0 && tokenAmt > 0 ? tokenAmt * pricePerToken : 0;

        items.push({
          id: `trade-${tx.transactionHash || `${tx.type}-${tx.timestamp}`}`,
          type: 'trade',
          message: `${tx.type === 'buy' ? 'Bought' : 'Sold'} ${tokenAmt.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens`,
          amount: usdValue > 0 ? usdValue : null,
          amountSol: Number.isFinite(solAmt) ? solAmt : 0,
          timestamp: tx.timestamp ? new Date(tx.timestamp).toISOString() : new Date().toISOString(),
          meta: {
            agentAddress: tx.agentAddress,
            side: tx.type,
            txHash: tx.transactionHash,
            tokenAmount: tokenAmt,
            pricePerToken
          }
        });
      }

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({ success: true, data: items.slice(0, limit) });
    } catch (error) {
      console.error('profile:activity error', error);
      res.status(500).json({ success: false, error: 'Failed to load activity' });
    }
  }
);

module.exports = router;
