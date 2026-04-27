const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true, trim: true },
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, trim: true },
  categoria: { type: String, trim: true },
  precioCompra: { type: Number, required: true, min: 0 },
  precioVenta: { type: Number, required: true, min: 0 },
  unidad: { type: String, default: 'unidad' },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Producto', productoSchema);
