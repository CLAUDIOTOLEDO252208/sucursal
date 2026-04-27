const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const Producto = require('../models/Producto');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET stock by location (null = deposito, id = sucursal)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    // sucursal param: 'deposito' or sucursal ID
    if (req.query.ubicacion === 'deposito') {
      filter.sucursal = null;
    } else if (req.query.ubicacion) {
      filter.sucursal = req.query.ubicacion;
    } else if (req.user.rol === 'sucursal') {
      filter.sucursal = req.user.sucursal?._id;
    }

    const stock = await Stock.find(filter)
      .populate('producto')
      .populate('sucursal')
      .sort({ 'producto.nombre': 1 });

    res.json(stock);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET stock alerts (low stock)
router.get('/alertas', async (req, res) => {
  try {
    const filter = req.user.rol === 'sucursal'
      ? { sucursal: req.user.sucursal?._id }
      : {};
    const stocks = await Stock.find(filter).populate('producto').populate('sucursal');
    const alertas = stocks.filter(s => s.cantidad <= s.stockMinimo && s.producto?.activo);
    res.json(alertas);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update stock (deposito manual ingress)
router.put('/:id', authorize('superadmin', 'deposito'), async (req, res) => {
  try {
    const { cantidad, stockMinimo } = req.body;
    const update = {};
    if (cantidad !== undefined) update.cantidad = cantidad;
    if (stockMinimo !== undefined) update.stockMinimo = stockMinimo;
    const stock = await Stock.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('producto').populate('sucursal');
    res.json(stock);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// POST adjust stock (add/subtract)
router.post('/ajuste', authorize('superadmin', 'deposito'), async (req, res) => {
  try {
    const { productoId, sucursalId, cantidad, tipo } = req.body;
    // tipo: 'ingreso' | 'egreso'
    const filter = { producto: productoId, sucursal: sucursalId || null };
    let stock = await Stock.findOne(filter);
    if (!stock) {
      stock = await Stock.create({ ...filter, cantidad: 0 });
    }
    if (tipo === 'ingreso') {
      stock.cantidad += Number(cantidad);
    } else {
      if (stock.cantidad < cantidad) return res.status(400).json({ message: 'Stock insuficiente' });
      stock.cantidad -= Number(cantidad);
    }
    await stock.save();
    await stock.populate('producto');
    res.json(stock);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Ensure all sucursales have stock entries for all products
router.post('/inicializar/:sucursalId', authorize('superadmin'), async (req, res) => {
  try {
    const productos = await Producto.find({ activo: true });
    for (const p of productos) {
      await Stock.findOneAndUpdate(
        { producto: p._id, sucursal: req.params.sucursalId },
        { $setOnInsert: { cantidad: 0, stockMinimo: 5 } },
        { upsert: true, new: true }
      );
    }
    res.json({ message: 'Stock inicializado para la sucursal' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
