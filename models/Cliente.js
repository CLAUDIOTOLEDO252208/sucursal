const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  telefono: { type: String, trim: true },
  direccion: { type: String, trim: true },
  dni: { type: String, trim: true },
  sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', required: true },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Cliente', clienteSchema);
