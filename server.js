const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
// app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(
  cors({
    origin: [
      "origin: process.env.CLIENT_URL",
      "https://multisucursalweb.netlify.app",
    ],
    credentials: true,
  }),
);
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/sucursales", require("./routes/sucursales"));
app.use("/api/productos", require("./routes/productos"));
app.use("/api/stock", require("./routes/stock"));
app.use("/api/ventas", require("./routes/ventas"));
app.use("/api/clientes", require("./routes/clientes"));
app.use("/api/pedidos", require("./routes/pedidos"));
app.use("/api/usuarios", require("./routes/usuarios"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/caja", require("./routes/caja"));

// Health check
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date() }),
);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Error interno del servidor" });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/multisucursal")
  .then(async () => {
    console.log("✅ MongoDB conectado");
    await require("./utils/seed")();
    app.listen(PORT, () =>
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`),
    );
  })
  .catch((err) => {
    console.error("❌ Error conectando MongoDB:", err.message);
    process.exit(1);
  });
