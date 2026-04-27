const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' });

    const user = await User.findOne({ email }).populate('sucursal');
    if (!user || !user.activo) return res.status(401).json({ message: 'Credenciales inválidas' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas' });

    res.json({ token: generateToken(user._id), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json(req.user));

// PUT /api/auth/password
router.put('/password', protect, async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(passwordActual);
    if (!isMatch) return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    user.password = passwordNueva;
    await user.save();
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
