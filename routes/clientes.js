const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.rol === 'sucursal') filter.sucursal = req.user.sucursal?._id;
    else if (req.query.sucursal) filter.sucursal = req.query.sucursal;
    if (req.query.q) filter.nombre = { $regex: req.query.q, $options: 'i' };
    filter.activo = true;
    const clientes = await Cliente.find(filter).populate('sucursal', 'nombre').sort({ nombre: 1 });
    res.json(clientes);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id).populate('sucursal');
    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', authorize('superadmin', 'sucursal'), async (req, res) => {
  try {
    const sucursal = req.user.rol === 'sucursal' ? req.user.sucursal?._id : req.body.sucursal;
    const cliente = await Cliente.create({ ...req.body, sucursal });
    res.status(201).json(cliente);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', authorize('superadmin', 'sucursal'), async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', authorize('superadmin', 'sucursal'), async (req, res) => {
  try {
    await Cliente.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ message: 'Cliente eliminado' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
