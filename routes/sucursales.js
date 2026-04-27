const express = require('express');
const router = express.Router();
const Sucursal = require('../models/Sucursal');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET all
router.get('/', async (req, res) => {
  try {
    const sucursales = await Sucursal.find().sort({ nombre: 1 });
    res.json(sucursales);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET one
router.get('/:id', async (req, res) => {
  try {
    const sucursal = await Sucursal.findById(req.params.id);
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });
    res.json(sucursal);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create
router.post('/', authorize('superadmin'), async (req, res) => {
  try {
    const sucursal = await Sucursal.create(req.body);
    res.status(201).json(sucursal);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PUT update
router.put('/:id', authorize('superadmin'), async (req, res) => {
  try {
    const sucursal = await Sucursal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });
    res.json(sucursal);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE (soft delete)
router.delete('/:id', authorize('superadmin'), async (req, res) => {
  try {
    await Sucursal.findByIdAndUpdate(req.params.id, { activa: false });
    res.json({ message: 'Sucursal desactivada' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
