const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

module.exports = async function (req, res, next) {
  const authHeader = req.header('Authorization');
  let token = authHeader ? authHeader.replace('Bearer ', '').trim() : (req.query?.token || req.query?.auth || '');
  if (!token) return res.status(401).json({ message: 'Access Denied. No token provided.' });

  let verified;
  try {
    verified = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }

  try {
    // If token already has verified superadmin claim
    if (verified.role === 'superadmin') {
      req.admin = verified;
      return next();
    }

    const adminId = verified._id || verified.id;
    if (!adminId) {
      return res.status(401).json({ message: 'Access Denied. Invalid token claims.' });
    }

    // Fallback: Verify admin user from PostgreSQL DB
    const adminUser = await prisma.admin.findUnique({
      where: { id: String(adminId) }
    });

    if (!adminUser) {
      return res.status(401).json({ message: 'Access Denied. User not found.' });
    }

    if (adminUser.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden. Super Admin access required.' });
    }

    req.admin = { ...verified, role: adminUser.role, id: adminUser.id, _id: adminUser.id };
    next();
  } catch (err) {
    if (verified && (verified._id || verified.id)) {
      req.admin = verified;
      return next();
    }
    res.status(500).json({ message: 'Database authentication error: ' + err.message });
  }
};
