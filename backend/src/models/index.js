// =================================================================
// ARCHIVO: src/models/index.js
// ROL: Punto central de la capa de modelos de Sequelize.
//      Este archivo se encarga de:
//      1. Importar todos los archivos de modelos individuales.
//      2. Inicializar cada modelo con la conexión a la base de datos.
//      3. Definir todas las asociaciones (relaciones) entre los modelos.
//      4. Exportar un único objeto 'db' con todos los modelos listos para usar.
// =================================================================

import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';

// --- Importación de las definiciones de cada modelo ---
import UsuarioModel from './usuario.model.js';
import RolModel from './rol.model.js';
import CategoriaModel from './categoria.model.js';
import ProductoModel from './producto.model.js';
import MesaModel from './mesa.model.js';
import PedidoModel from './pedido.model.js';
import DetallePedidoModel from './detalle_pedido.model.js';
import MetodoPagoModel from './metodo_pago.model.js';
import FacturaModel from './factura.model.js';
import TransaccionPagoModel from './transaccion_pago.model.js';
import RefreshTokenSessionModel from './refresh_token_session.model.js';

// Objeto 'db' que actuará como contenedor centralizado.
const db = {};

// Se añaden la clase Sequelize y la instancia de conexión al objeto db para fácil acceso.
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// --- Inicialización de todos los modelos ---
// Cada función de modelo es llamada, pasándole la instancia de sequelize y los DataTypes.
// El modelo retornado se asigna a una propiedad dentro del objeto 'db'.
db.Usuario = UsuarioModel(sequelize, Sequelize);
db.Rol = RolModel(sequelize, Sequelize);
db.Categoria = CategoriaModel(sequelize, Sequelize);
db.Producto = ProductoModel(sequelize, Sequelize);
db.Mesa = MesaModel(sequelize, Sequelize);
db.Pedido = PedidoModel(sequelize, Sequelize);
db.DetallePedido = DetallePedidoModel(sequelize, Sequelize);
db.MetodoPago = MetodoPagoModel(sequelize, Sequelize);
db.Factura = FacturaModel(sequelize, Sequelize);
db.TransaccionPago = TransaccionPagoModel(sequelize, Sequelize);
db.RefreshTokenSession = RefreshTokenSessionModel(sequelize, Sequelize);



// --- Definición de Asociaciones (Relaciones) ---
// Esta sección es crucial, ya que le enseña a Sequelize cómo están conectadas las tablas.

// Relación Uno a Muchos: Un Rol puede tener muchos Usuarios.
db.Rol.hasMany(db.Usuario, { foreignKey: 'rol_id' });
db.Usuario.belongsTo(db.Rol, { foreignKey: 'rol_id' });

// Relación Uno a Muchos: Una Categoría puede tener muchos Productos.
db.Categoria.hasMany(db.Producto, { foreignKey: 'categoria_id' });
db.Producto.belongsTo(db.Categoria, { foreignKey: 'categoria_id' });

// Relación Uno a Muchos: Un Usuario (mesero) puede tomar muchos Pedidos.
db.Usuario.hasMany(db.Pedido, { foreignKey: 'usuario_id' });
db.Pedido.belongsTo(db.Usuario, { foreignKey: 'usuario_id' });

// Relación Uno a Muchos: Un Usuario puede tener múltiples sesiones de refresh token.
db.Usuario.hasMany(db.RefreshTokenSession, { foreignKey: 'usuario_id' });
db.RefreshTokenSession.belongsTo(db.Usuario, { foreignKey: 'usuario_id' });

// Relación Uno a Muchos: Una Mesa puede tener muchos Pedidos.
db.Mesa.hasMany(db.Pedido, { foreignKey: 'mesa_id' });
db.Pedido.belongsTo(db.Mesa, { foreignKey: 'mesa_id' });

// Relación Muchos a Muchos: Pedidos y Productos a través de DetallePedido.
// Un Pedido puede tener muchos Productos.
db.Pedido.belongsToMany(db.Producto, { through: db.DetallePedido, foreignKey: 'pedido_id' });
// Un Producto puede estar en muchos Pedidos.
db.Producto.belongsToMany(db.Pedido, { through: db.DetallePedido, foreignKey: 'producto_id' });

// Asociaciones explícitas con la tabla de unión para acceso directo si es necesario.
db.DetallePedido.belongsTo(db.Pedido, { foreignKey: 'pedido_id' });
db.Pedido.hasMany(db.DetallePedido, { foreignKey: 'pedido_id' });
db.DetallePedido.belongsTo(db.Producto, { foreignKey: 'producto_id' });
db.Producto.hasMany(db.DetallePedido, { foreignKey: 'producto_id' });

// Relación Uno a Uno: Un Pedido tiene una Factura.
db.Pedido.hasOne(db.Factura, { foreignKey: 'pedido_id' });
db.Factura.belongsTo(db.Pedido, { foreignKey: 'pedido_id' });

// Relación Uno a Muchos: Un MetodoPago puede estar en muchas Facturas.
db.MetodoPago.hasMany(db.Factura, { foreignKey: 'metodo_pago_id' });
db.Factura.belongsTo(db.MetodoPago, { foreignKey: 'metodo_pago_id' });

// Relación Uno a Muchos: Una Factura puede tener múltiples Transacciones de Pago.
db.Factura.hasMany(db.TransaccionPago, { foreignKey: 'factura_id' });
db.TransaccionPago.belongsTo(db.Factura, { foreignKey: 'factura_id' });

// Relación Uno a Muchos: Un MetodoPago puede ser usado en muchas Transacciones.
db.MetodoPago.hasMany(db.TransaccionPago, { foreignKey: 'metodo_pago_id' });
db.TransaccionPago.belongsTo(db.MetodoPago, { foreignKey: 'metodo_pago_id' });

// Se exporta el objeto 'db' que contiene todos los modelos y sus relaciones configuradas.
export default db;
