const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nacl = require('tweetnacl');
const { PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
const User = require('../models/User');

class AuthService {
 constructor() {
 if (!process.env.JWT_SECRET) {
 throw new Error('JWT_SECRET environment variable is required. Set it in your.env file.');
 }
 this.jwtSecret = process.env.JWT_SECRET;
 this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
 this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
 this.tokenBlacklist = new Map(); // token -> expiry timestamp
 this._startBlacklistCleanup();
 }

 // Periodically clean expired tokens from blacklist
 _startBlacklistCleanup() {
 this._cleanupInterval = setInterval(() => {
 const now = Date.now();
 for (const [token, expiry] of this.tokenBlacklist) {
 if (expiry <= now) {
 this.tokenBlacklist.delete(token);
 }
 }
 }, 60 * 60 * 1000); // Clean every hour
 }

 // Generate JWT token
 generateToken(payload) {
 return jwt.sign(payload, this.jwtSecret, {
 expiresIn: this.jwtExpiresIn
 });
 }

 // Verify JWT token
 verifyToken(token) {
 try {
 if (this.tokenBlacklist.has(token)) {
 throw new Error('Token has been revoked');
 }
 return jwt.verify(token, this.jwtSecret);
 } catch (error) {
 throw new Error('Invalid or expired token');
 }
 }

 // Generate cryptographically secure nonce for wallet authentication
 generateNonce() {
 return require('crypto').randomBytes(32).toString('hex');
 }

 // Verify wallet signature (Solana ed25519)
 verifyWalletSignature(walletAddress, signature, nonce) {
 try {
 const message = `Sign this message to authenticate with URSUS: ${nonce}`;
 const messageBytes = new TextEncoder().encode(message);
 const signatureBytes = bs58.decode(signature);
 const publicKeyBytes = new PublicKey(walletAddress).toBytes();
 return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
 } catch (error) {
 console.error('Signature verification error:', error);
 return false;
 }
 }

 // Wallet-based authentication (Web3)
 async authenticateWallet(walletAddress, signature, nonce) {
 try {
 // Verify signature
 if (!this.verifyWalletSignature(walletAddress, signature, nonce)) {
 throw new Error('Invalid signature');
 }

 // Find or create user
 let user = await User.findByWallet(walletAddress);

 if (!user) {
 // Create new user
 user = new User({
 walletAddress: walletAddress.toLowerCase(),
 nonce: this.generateNonce()
 });
 await user.save();
 console.log(` New user created: ${walletAddress}`);
 } else {
 // Update login info
 await user.updateLoginInfo();
 // Generate new nonce for next login
 user.generateNonce();
 await user.save();
 }

 // Generate JWT token
 const token = this.generateToken({
 userId: user._id,
 walletAddress: user.walletAddress,
 type: 'wallet'
 });

 return {
 success: true,
 token,
 user: {
 id: user._id,
 walletAddress: user.walletAddress,
 username: user.username,
 avatar: user.avatar,
 isVerified: user.isVerified,
 subscription: user.subscription,
 reputation: user.reputation
 }
 };
 } catch (error) {
 console.error('Wallet authentication error:', error);
 return {
 success: false,
 error: error.message
 };
 }
 }

 // Traditional email/password authentication
 async authenticateEmail(email, password) {
 try {
 const user = await User.findOne({ email: email.toLowerCase() });

 if (!user) {
 throw new Error('User not found');
 }

 // Verify password (if user has set one)
 if (user.password &&!await bcrypt.compare(password, user.password)) {
 throw new Error('Invalid password');
 }

 // Update login info
 await user.updateLoginInfo();

 // Generate JWT token
 const token = this.generateToken({
 userId: user._id,
 email: user.email,
 type: 'email'
 });

 return {
 success: true,
 token,
 user: {
 id: user._id,
 email: user.email,
 username: user.username,
 avatar: user.avatar,
 isVerified: user.isVerified,
 subscription: user.subscription,
 reputation: user.reputation
 }
 };
 } catch (error) {
 console.error('Email authentication error:', error);
 return {
 success: false,
 error: error.message
 };
 }
 }

 // Get nonce for wallet authentication
 async getNonce(walletAddress) {
 try {
 let user = await User.findByWallet(walletAddress);

 if (!user) {
 // Create user with nonce
 user = new User({
 walletAddress: walletAddress.toLowerCase(),
 nonce: this.generateNonce()
 });
 await user.save();
 }

 return {
 success: true,
 nonce: user.nonce,
 message: `Sign this message to authenticate with URSUS: ${user.nonce}`
 };
 } catch (error) {
 console.error('Get nonce error:', error);
 return {
 success: false,
 error: error.message
 };
 }
 }

 // Refresh token
 async refreshToken(token) {
 try {
 const decoded = this.verifyToken(token);

 // Find user
 const user = await User.findById(decoded.userId);
 if (!user) {
 throw new Error('User not found');
 }

 // Generate new token
 const newToken = this.generateToken({
 userId: user._id,
 walletAddress: user.walletAddress,
 email: user.email,
 type: decoded.type
 });

 return {
 success: true,
 token: newToken,
 user: {
 id: user._id,
 walletAddress: user.walletAddress,
 email: user.email,
 username: user.username,
 avatar: user.avatar,
 isVerified: user.isVerified,
 subscription: user.subscription,
 reputation: user.reputation
 }
 };
 } catch (error) {
 console.error('Token refresh error:', error);
 return {
 success: false,
 error: error.message
 };
 }
 }

 // Logout (invalidate token via blacklist)
 async logout(token) {
 try {
 const decoded = jwt.verify(token, this.jwtSecret);
 // Add to blacklist until token's natural expiry
 const expiryMs = decoded.exp * 1000;
 this.tokenBlacklist.set(token, expiryMs);

 return {
 success: true,
 message: 'Logged out successfully'
 };
 } catch (error) {
 return {
 success: false,
 error: 'Invalid token'
 };
 }
 }

 // Middleware for protecting routes
 authenticateToken(req, res, next) {
 const authHeader = req.headers['authorization'];
 const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

 if (!token) {
 return res.status(401).json({ error: 'Access token required' });
 }

 try {
 const decoded = this.verifyToken(token);
 req.user = decoded;
 next();
 } catch (error) {
 return res.status(403).json({ error: 'Invalid or expired token' });
 }
 }

 // Optional authentication middleware (doesn't fail if no token)
 optionalAuth(req, res, next) {
 const authHeader = req.headers['authorization'];
 const token = authHeader && authHeader.split(' ')[1];

 if (token) {
 try {
 const decoded = this.verifyToken(token);
 req.user = decoded;
 } catch (error) {
 // Token invalid, but continue without auth
 req.user = null;
 }
 } else {
 req.user = null;
 }

 next();
 }

 // Check if user has specific permission
 async hasPermission(userId, permission) {
 try {
 const user = await User.findById(userId);
 if (!user) return false;

 // Check subscription features
 if (user.subscription.features.includes(permission)) {
 return true;
 }

 // Check verification level
 const permissionLevels = {
 'create_agent': ['basic', 'advanced', 'premium'],
 'premium_features': ['advanced', 'premium'],
 'advanced_analytics': ['premium']
 };

 const requiredLevels = permissionLevels[permission];
 if (requiredLevels && requiredLevels.includes(user.verificationLevel)) {
 return true;
 }

 return false;
 } catch (error) {
 console.error('Permission check error:', error);
 return false;
 }
 }

 // Rate limiting helper
 createRateLimiter(windowMs = 15 * 60 * 1000, max = 100) {
 const attempts = new Map();

 return (req, res, next) => {
 const key = req.ip || req.connection.remoteAddress;
 const now = Date.now();
 const windowStart = now - windowMs;

 // Clean old attempts
 const userAttempts = attempts.get(key) || [];
 const validAttempts = userAttempts.filter(time => time > windowStart);

 if (validAttempts.length >= max) {
 return res.status(429).json({
 error: 'Too many requests',
 retryAfter: Math.ceil((validAttempts[0] + windowMs - now) / 1000)
 });
 }

 // Add current attempt
 validAttempts.push(now);
 attempts.set(key, validAttempts);

 next();
 };
 }
}

module.exports = new AuthService();
