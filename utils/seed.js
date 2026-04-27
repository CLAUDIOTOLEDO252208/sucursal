const User = require('../models/User');
const Producto = require('../models/Producto');
const Stock = require('../models/Stock');

module.exports = async function seed() {
  try {
    // Check if already seeded
    const adminExists = await User.findOne({ rol: 'superadmin' });
    if (adminExists) return;

    console.log('🌱 Creando datos iniciales...');

    // Create superadmin
    await User.create({
      nombre: 'Super Admin',
      email: 'admin@sistema.com',
      password: 'admin123',
      rol: 'superadmin'
    });

    // Create deposito user
    await User.create({
      nombre: 'Depósito Central',
      email: 'deposito@sistema.com',
      password: 'deposito123',
      rol: 'deposito'
    });

    // Create sample products
    const productos = await Producto.insertMany([
      { codigo: 'P001', nombre: 'Producto A', categoria: 'General', precioCompra: 100, precioVenta: 150 },
      { codigo: 'P002', nombre: 'Producto B', categoria: 'General', precioCompra: 200, precioVenta: 300 },
      { codigo: 'P003', nombre: 'Producto C', categoria: 'Especial', precioCompra: 50, precioVenta: 80 },
      { codigo: 'P004', nombre: 'Producto D', categoria: 'Especial', precioCompra: 350, precioVenta: 500 },
      { codigo: 'P005', nombre: 'Producto E', categoria: 'General', precioCompra: 120, precioVenta: 180 },
    ]);

    // Create stock for deposito
    for (const p of productos) {
      await Stock.create({ producto: p._id, sucursal: null, cantidad: 100, stockMinimo: 10 });
    }

    console.log('✅ Datos iniciales creados');
    console.log('   👤 admin@sistema.com / admin123');
    console.log('   👤 deposito@sistema.com / deposito123');
  } catch (err) {
    console.error('❌ Error en seed:', err.message);
  }
};
