const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'No autorizado, token requerido' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = await User.findById(decoded.id).populate('sucursal');
    if (!req.user || !req.user.activo) return res.status(401).json({ message: 'Usuario no válido' });
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.rol)) {
    return res.status(403).json({ message: 'Sin permisos para esta acción' });
  }
  next();
};

// Middleware to ensure sucursal users only access their own data
const mySucursal = (req, res, next) => {
  if (req.user.rol === 'superadmin') return next();
  if (req.user.rol === 'sucursal') {
    req.sucursalId = req.user.sucursal?._id;
  }
  next();
};

module.exports = { protect, authorize, mySucursal };
