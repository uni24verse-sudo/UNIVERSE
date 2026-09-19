const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ message: 'Access Denied. No token provided.' });

  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access Denied.' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = verified;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please login again.', code: 'TOKEN_EXPIRED' });
    }
    res.status(401).json({ message: 'Invalid or expired token.', code: 'INVALID_TOKEN' });
  }
};

