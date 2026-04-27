const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  // null = depósito central
  sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', default: null },
  cantidad: { type: Number, required: true, default: 0, min: 0 },
  stockMinimo: { type: Number, default: 5 }
}, { timestamps: true });

// Unique index: one stock record per product per location
stockSchema.index({ producto: 1, sucursal: 1 }, { unique: true });

stockSchema.virtual('bajStock').get(function() {
  return this.cantidad <= this.stockMinimo;
});

module.exports = mongoose.model('Stock', stockSchema);
