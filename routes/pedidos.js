const express = require('express');
const router = express.Router();
const Pedido = require('../models/Pedido');
const Stock = require('../models/Stock');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.rol === 'sucursal') filter.sucursal = req.user.sucursal?._id;
    else if (req.query.sucursal) filter.sucursal = req.query.sucursal;
    if (req.query.estado) filter.estado = req.query.estado;

    const pedidos = await Pedido.find(filter)
      .populate('sucursal', 'nombre')
      .populate('creadoPor', 'nombre')
      .populate('preparadoPor', 'nombre')
      .populate('items.producto', 'nombre codigo')
      .sort({ createdAt: -1 });

    res.json(pedidos);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
      .populate('sucursal').populate('creadoPor', 'nombre').populate('preparadoPor', 'nombre')
      .populate('items.producto');
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });
    res.json(pedido);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create pedido (sucursal -> deposito)
router.post('/', authorize('superadmin', 'sucursal'), async (req, res) => {
  try {
    const sucursal = req.user.rol === 'sucursal' ? req.user.sucursal?._id : req.body.sucursal;
    const pedido = await Pedido.create({ ...req.body, sucursal, creadoPor: req.user._id });
    await pedido.populate(['sucursal', 'items.producto', { path: 'creadoPor', select: 'nombre' }]);
    res.status(201).json(pedido);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Update estado del pedido (deposito workflow)
router.put('/:id/estado', authorize('superadmin', 'deposito'), async (req, res) => {
  try {
    const { estado, observacionesDeposito, items } = req.body;
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });

    const update = { estado };
    if (observacionesDeposito) update.observacionesDeposito = observacionesDeposito;

    // When sending, update quantities and discount deposito stock
    if (estado === 'enviado') {
      if (items) {
        for (let i = 0; i < pedido.items.length; i++) {
          if (items[i]) pedido.items[i].cantidadEnviada = items[i].cantidadEnviada || pedido.items[i].cantidadSolicitada;
        }
      } else {
        pedido.items.forEach(item => { item.cantidadEnviada = item.cantidadSolicitada; });
      }

      // Discount from deposito stock
      for (const item of pedido.items) {
        const cantEnv = item.cantidadEnviada || 0;
        if (cantEnv > 0) {
          await Stock.findOneAndUpdate(
            { producto: item.producto, sucursal: null },
            { $inc: { cantidad: -cantEnv } }
          );
        }
      }

      update['items'] = pedido.items;
      update.preparadoPor = req.user._id;
      update.fechaEnvio = new Date();
    }

    const updated = await Pedido.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('sucursal', 'nombre').populate('creadoPor', 'nombre')
      .populate('preparadoPor', 'nombre').populate('items.producto');

    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Sucursal confirms receipt - adds to sucursal stock
router.put('/:id/recibir', authorize('superadmin', 'sucursal'), async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido || pedido.estado !== 'enviado') {
      return res.status(400).json({ message: 'El pedido no está en estado enviado' });
    }

    const sucursalId = req.user.rol === 'sucursal' ? req.user.sucursal?._id : pedido.sucursal;

    // Add to sucursal stock
    for (const item of pedido.items) {
      const cant = item.cantidadEnviada || 0;
      if (cant > 0) {
        await Stock.findOneAndUpdate(
          { producto: item.producto, sucursal: sucursalId },
          { $inc: { cantidad: cant }, $setOnInsert: { stockMinimo: 5 } },
          { upsert: true }
        );
      }
    }

    const updated = await Pedido.findByIdAndUpdate(
      req.params.id,
      { estado: 'recibido', fechaRecepcion: new Date() },
      { new: true }
    ).populate('sucursal', 'nombre').populate('items.producto');

    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Cancel pedido
router.put('/:id/cancelar', async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido || ['enviado', 'recibido'].includes(pedido.estado)) {
      return res.status(400).json({ message: 'No se puede cancelar este pedido' });
    }
    await Pedido.findByIdAndUpdate(req.params.id, { estado: 'cancelado' });
    res.json({ message: 'Pedido cancelado' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
