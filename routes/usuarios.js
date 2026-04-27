const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', authorize('superadmin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.rol) filter.rol = req.query.rol;
    if (req.query.sucursal) filter.sucursal = req.query.sucursal;
    const users = await User.find(filter).populate('sucursal', 'nombre').sort({ nombre: 1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', authorize('superadmin'), async (req, res) => {
  try {
    const user = await User.create(req.body);
    await user.populate('sucursal', 'nombre');
    res.status(201).json(user);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', authorize('superadmin'), async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    Object.assign(user, rest);
    if (password) user.password = password;
    await user.save();
    await user.populate('sucursal', 'nombre');
    res.json(user);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', authorize('superadmin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'No puedes desactivarte a vos mismo' });
    }
    await User.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ message: 'Usuario desactivado' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
