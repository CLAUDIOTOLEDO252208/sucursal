const mongoose = require('mongoose');

const itemVentaSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  cantidad: { type: Number, required: true, min: 1 },
  precioUnitario: { type: Number, required: true },
  subtotal: { type: Number, required: true }
}, { _id: false });

const ventaSchema = new mongoose.Schema({
  numero: { type: Number },
  sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', required: true },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
  clienteNombre: { type: String, default: 'Consumidor Final' },
  items: [itemVentaSchema],
  subtotal: { type: Number, required: true },
  descuento: { type: Number, default: 0 },
  total: { type: Number, required: true },
  medioPago: { type: String, enum: ['efectivo', 'tarjeta', 'transferencia', 'otro'], default: 'efectivo' },
  estado: { type: String, enum: ['completada', 'anulada'], default: 'completada' },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  observaciones: { type: String }
}, { timestamps: true });

// Auto-increment numero por sucursal
ventaSchema.pre('save', async function(next) {
  if (this.isNew) {
    const last = await this.constructor.findOne({ sucursal: this.sucursal }).sort({ numero: -1 });
    this.numero = last ? last.numero + 1 : 1;
  }
  next();
});

module.exports = mongoose.model('Venta', ventaSchema);
