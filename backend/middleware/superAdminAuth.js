const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async function (req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ message: 'Access Denied. No token provided.' });

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ message: 'Access Denied. Token missing.' });

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

    // Fallback: Verify admin user from DB
    const adminUser = await Admin.findById(verified._id);
    if (!adminUser) {
      return res.status(401).json({ message: 'Access Denied. User not found.' });
    }

    if (adminUser.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden. Super Admin access required.' });
    }

    req.admin = { ...verified, role: adminUser.role };
    next();
  } catch (err) {
    // If database connection timed out but token is validly signed with user ID
    if (verified && verified._id) {
      req.admin = verified;
      return next();
    }
    res.status(500).json({ message: 'Database authentication error: ' + err.message });
  }
};
