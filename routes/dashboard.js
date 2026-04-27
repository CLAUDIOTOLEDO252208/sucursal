const express = require('express');
const router = express.Router();
const Venta = require('../models/Venta');
const Pedido = require('../models/Pedido');
const Stock = require('../models/Stock');
const Cliente = require('../models/Cliente');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date();
    fin.setHours(23, 59, 59, 999);

    const sucursalFilter = req.user.rol === 'sucursal'
      ? { sucursal: req.user.sucursal?._id }
      : req.query.sucursal ? { sucursal: req.query.sucursal } : {};

    // Ventas de hoy
    const [ventasHoy, ventasMes, pedidosPendientes, alertasStock, clientes] = await Promise.all([
      Venta.aggregate([
        { $match: { ...sucursalFilter, createdAt: { $gte: hoy, $lte: fin }, estado: 'completada' } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Venta.aggregate([
        { $match: { ...sucursalFilter, createdAt: { $gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1) }, estado: 'completada' } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Pedido.countDocuments({
        ...(req.user.rol === 'sucursal' ? sucursalFilter : {}),
        estado: { $in: ['pendiente', 'en_preparacion'] }
      }),
      Stock.countDocuments({
        ...(req.user.rol === 'sucursal' ? { sucursal: req.user.sucursal?._id } : req.user.rol === 'deposito' ? { sucursal: null } : {}),
        $expr: { $lte: ['$cantidad', '$stockMinimo'] }
      }),
      Cliente.countDocuments({ ...sucursalFilter, activo: true })
    ]);

    // Recent ventas
    const ultimasVentas = await Venta.find({ ...sucursalFilter, estado: 'completada' })
      .populate('sucursal', 'nombre').populate('cliente', 'nombre')
      .sort({ createdAt: -1 }).limit(5);

    // Ventas por dia (last 7 days)
    const hace7 = new Date();
    hace7.setDate(hace7.getDate() - 6);
    hace7.setHours(0, 0, 0, 0);
    const ventasPorDia = await Venta.aggregate([
      { $match: { ...sucursalFilter, createdAt: { $gte: hace7 }, estado: 'completada' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      ventasHoy: ventasHoy[0] || { total: 0, count: 0 },
      ventasMes: ventasMes[0] || { total: 0, count: 0 },
      pedidosPendientes,
      alertasStock,
      clientes,
      ultimasVentas,
      ventasPorDia
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
