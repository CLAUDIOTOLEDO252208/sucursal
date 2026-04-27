const express = require('express');
const router = express.Router();
const Venta = require('../models/Venta');
const Stock = require('../models/Stock');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.rol === 'sucursal') filter.sucursal = req.user.sucursal?._id;
    else if (req.query.sucursal) filter.sucursal = req.query.sucursal;

    if (req.query.desde || req.query.hasta) {
      filter.createdAt = {};
      if (req.query.desde) filter.createdAt.$gte = new Date(req.query.desde);
      if (req.query.hasta) {
        const hasta = new Date(req.query.hasta);
        hasta.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = hasta;
      }
    }

    const ventas = await Venta.find(filter)
      .populate('sucursal', 'nombre')
      .populate('cliente', 'nombre')
      .populate('usuario', 'nombre')
      .populate('items.producto', 'nombre codigo')
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 100);

    res.json(ventas);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
      .populate('sucursal').populate('cliente').populate('usuario', 'nombre')
      .populate('items.producto');
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(venta);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', authorize('superadmin', 'sucursal'), async (req, res) => {
  try {
    const sucursalId = req.user.rol === 'sucursal' ? req.user.sucursal?._id : req.body.sucursal;

    // Validate and update stock
    for (const item of req.body.items) {
      const stock = await Stock.findOne({ producto: item.producto, sucursal: sucursalId });
      if (!stock || stock.cantidad < item.cantidad) {
        return res.status(400).json({ message: `Stock insuficiente para el producto` });
      }
    }

    const venta = await Venta.create({
      ...req.body,
      sucursal: sucursalId,
      usuario: req.user._id
    });

    // Decrease stock
    for (const item of req.body.items) {
      await Stock.findOneAndUpdate(
        { producto: item.producto, sucursal: sucursalId },
        { $inc: { cantidad: -item.cantidad } }
      );
    }

    await venta.populate(['sucursal', 'items.producto', { path: 'cliente', select: 'nombre' }]);
    res.status(201).json(venta);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Anular venta
router.put('/:id/anular', authorize('superadmin'), async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id);
    if (!venta || venta.estado === 'anulada') return res.status(400).json({ message: 'Venta no válida' });
    venta.estado = 'anulada';
    await venta.save();
    // Restore stock
    for (const item of venta.items) {
      await Stock.findOneAndUpdate(
        { producto: item.producto, sucursal: venta.sucursal },
        { $inc: { cantidad: item.cantidad } }
      );
    }
    res.json(venta);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
