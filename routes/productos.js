const express = require('express');
const router = express.Router();
const Producto = require('../models/Producto');
const Stock = require('../models/Stock');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.activo !== undefined) filter.activo = req.query.activo === 'true';
    if (req.query.categoria) filter.categoria = req.query.categoria;
    if (req.query.q) filter.nombre = { $regex: req.query.q, $options: 'i' };
    const productos = await Producto.find(filter).sort({ nombre: 1 });
    res.json(productos);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/categorias', async (req, res) => {
  try {
    const cats = await Producto.distinct('categoria', { activo: true });
    res.json(cats.filter(Boolean));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', authorize('superadmin', 'deposito'), async (req, res) => {
  try {
    const producto = await Producto.create(req.body);
    // Create stock entry for deposito
    await Stock.create({ producto: producto._id, sucursal: null, cantidad: 0 });
    res.status(201).json(producto);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', authorize('superadmin', 'deposito'), async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', authorize('superadmin'), async (req, res) => {
  try {
    await Producto.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ message: 'Producto desactivado' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
