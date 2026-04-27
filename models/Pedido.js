const mongoose = require('mongoose');

const itemPedidoSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  cantidadSolicitada: { type: Number, required: true, min: 1 },
  cantidadEnviada: { type: Number, default: 0 }
}, { _id: false });

const pedidoSchema = new mongoose.Schema({
  numero: { type: Number },
  sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', required: true },
  items: [itemPedidoSchema],
  estado: {
    type: String,
    enum: ['pendiente', 'en_preparacion', 'enviado', 'recibido', 'cancelado'],
    default: 'pendiente'
  },
  observaciones: { type: String },
  observacionesDeposito: { type: String },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  preparadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fechaEnvio: { type: Date },
  fechaRecepcion: { type: Date }
}, { timestamps: true });

pedidoSchema.pre('save', async function(next) {
  if (this.isNew) {
    const last = await this.constructor.findOne().sort({ numero: -1 });
    this.numero = last ? last.numero + 1 : 1;
  }
  next();
});

module.exports = mongoose.model('Pedido', pedidoSchema);
