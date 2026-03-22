const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async function (req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ message: 'Access Denied. No token provided.' });

  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access Denied.' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch the admin user from DB to verify role
    const adminUser = await Admin.findById(verified._id);
    if (!adminUser) {
        return res.status(401).json({ message: 'Access Denied. User not found.' });
    }

    if (adminUser.role !== 'superadmin') {
        return res.status(403).json({ message: 'Forbidden. Super Admin access required.' });
    }

    req.admin = verified; // Keep consistency with existing auth
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid Token.' });
  }
};
