const express = require('express');
const router = express.Router();
const Caja = require('../models/Caja');
const Venta = require('../models/Venta');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET cajas - admin ve todas, sucursal ve las suyas
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.rol === 'sucursal') filter.sucursal = req.user.sucursal?._id;
    else if (req.query.sucursal) filter.sucursal = req.query.sucursal;
    if (req.query.estado) filter.estado = req.query.estado;
    if (req.query.desde || req.query.hasta) {
      filter.fechaApertura = {};
      if (req.query.desde) filter.fechaApertura.$gte = new Date(req.query.desde);
      if (req.query.hasta) {
        const h = new Date(req.query.hasta); h.setHours(23,59,59,999);
        filter.fechaApertura.$lte = h;
      }
    }
    const cajas = await Caja.find(filter)
      .populate('sucursal', 'nombre')
      .populate('usuario', 'nombre')
      .sort({ fechaApertura: -1 })
      .limit(100);
    res.json(cajas);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET caja activa de la sucursal del usuario
router.get('/activa', async (req, res) => {
  try {
    const sucursalId = req.user.sucursal?._id || req.query.sucursal;
    if (!sucursalId) return res.json(null);
    const caja = await Caja.findOne({ sucursal: sucursalId, estado: 'abierta' })
      .populate('usuario', 'nombre')
      .populate('movimientos.usuario', 'nombre');
    res.json(caja);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET caja por ID
router.get('/:id', async (req, res) => {
  try {
    const caja = await Caja.findById(req.params.id)
      .populate('sucursal', 'nombre')
      .populate('usuario', 'nombre')
      .populate('movimientos.usuario', 'nombre');
    if (!caja) return res.status(404).json({ message: 'Caja no encontrada' });
    res.json(caja);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST abrir caja
router.post('/abrir', authorize('superadmin', 'sucursal'), async (req, res) => {
  try {
    const sucursalId = req.user.rol === 'sucursal' ? req.user.sucursal?._id : req.body.sucursal;
    // Verificar que no haya caja abierta
    const cajaAbierta = await Caja.findOne({ sucursal: sucursalId, estado: 'abierta' });
    if (cajaAbierta) return res.status(400).json({ message: 'Ya hay una caja abierta para esta sucursal' });

    const caja = await Caja.create({
      sucursal: sucursalId,
      usuario: req.user._id,
      saldoInicial: req.body.saldoInicial || 0,
      estado: 'abierta',
      fechaApertura: new Date()
    });
    await caja.populate(['sucursal', { path: 'usuario', select: 'nombre' }]);
    res.status(201).json(caja);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// POST agregar movimiento a caja abierta
router.post('/:id/movimiento', authorize('superadmin', 'sucursal'), async (req, res) => {
  try {
    const { tipo, concepto, monto } = req.body;
    if (!tipo || !concepto || !monto) return res.status(400).json({ message: 'Datos incompletos' });
    const caja = await Caja.findById(req.params.id);
    if (!caja || caja.estado !== 'abierta') return res.status(400).json({ message: 'Caja no disponible' });

    caja.movimientos.push({ tipo, concepto, monto: Number(monto), usuario: req.user._id });
    await caja.save();
    await caja.populate([{ path: 'usuario', select: 'nombre' }, { path: 'movimientos.usuario', select: 'nombre' }]);
    res.json(caja);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE movimiento
router.delete('/:id/movimiento/:movId', authorize('superadmin', 'sucursal'), async (req, res) => {
  try {
    const caja = await Caja.findById(req.params.id);
    if (!caja || caja.estado !== 'abierta') return res.status(400).json({ message: 'Caja no disponible' });
    caja.movimientos = caja.movimientos.filter(m => m._id.toString() !== req.params.movId);
    await caja.save();
    res.json(caja);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// POST cerrar caja
router.post('/:id/cerrar', authorize('superadmin', 'sucursal'), async (req, res) => {
  try {
    const caja = await Caja.findById(req.params.id);
    if (!caja || caja.estado !== 'abierta') return res.status(400).json({ message: 'La caja ya está cerrada' });

    // Calcular ventas del turno
    const ventas = await Venta.find({
      sucursal: caja.sucursal,
      estado: 'completada',
      createdAt: { $gte: caja.fechaApertura }
    });

    const totalEfectivo      = ventas.filter(v => v.medioPago === 'efectivo').reduce((a, v) => a + v.total, 0);
    const totalTarjeta        = ventas.filter(v => v.medioPago === 'tarjeta').reduce((a, v) => a + v.total, 0);
    const totalTransferencia  = ventas.filter(v => v.medioPago === 'transferencia').reduce((a, v) => a + v.total, 0);
    const totalOtro           = ventas.filter(v => v.medioPago === 'otro').reduce((a, v) => a + v.total, 0);
    const totalVentas         = ventas.reduce((a, v) => a + v.total, 0);

    const totalIngresos = caja.movimientos.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0);
    const totalEgresos  = caja.movimientos.filter(m => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0);

    // Saldo final = saldo inicial + ventas efectivo + ingresos manuales - egresos manuales
    const saldoFinal = caja.saldoInicial + totalEfectivo + totalIngresos - totalEgresos;

    caja.estado           = 'cerrada';
    caja.fechaCierre      = new Date();
    caja.totalVentas      = totalVentas;
    caja.totalEfectivo    = totalEfectivo;
    caja.totalTarjeta     = totalTarjeta;
    caja.totalTransferencia = totalTransferencia;
    caja.totalOtro        = totalOtro;
    caja.totalIngresos    = totalIngresos;
    caja.totalEgresos     = totalEgresos;
    caja.saldoFinal       = saldoFinal;
    caja.observaciones    = req.body.observaciones || '';

    await caja.save();
    await caja.populate(['sucursal', { path: 'usuario', select: 'nombre' }, { path: 'movimientos.usuario', select: 'nombre' }]);
    res.json(caja);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
