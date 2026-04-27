const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['ingreso', 'egreso'], required: true },
  concepto: { type: String, required: true, trim: true },
  monto: { type: Number, required: true, min: 0 },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const cajaSchema = new mongoose.Schema({
  sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', required: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  saldoInicial: { type: Number, required: true, default: 0 },
  movimientos: [movimientoSchema],
  estado: { type: String, enum: ['abierta', 'cerrada'], default: 'abierta' },
  fechaApertura: { type: Date, default: Date.now },
  fechaCierre: { type: Date },
  // Totales calculados al cierre
  totalVentas: { type: Number, default: 0 },
  totalEfectivo: { type: Number, default: 0 },
  totalTarjeta: { type: Number, default: 0 },
  totalTransferencia: { type: Number, default: 0 },
  totalOtro: { type: Number, default: 0 },
  totalIngresos: { type: Number, default: 0 },
  totalEgresos: { type: Number, default: 0 },
  saldoFinal: { type: Number, default: 0 },
  observaciones: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Caja', cajaSchema);
