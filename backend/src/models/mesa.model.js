// =================================================================
// ARCHIVO: src/models/mesa.model.js
// ROL: Define el modelo de Sequelize para la tabla 'mesas'.
//      Este modelo representa una mesa física en el restaurante,
//      un recurso clave para la gestión de pedidos.
//      Implementa soft delete mediante paranoid.
// =================================================================

/**
 * Define y exporta el modelo 'Mesa' de Sequelize.
 *
 * @param {object} sequelize - La instancia de conexión de Sequelize.
 * @param {object} DataTypes - El objeto que contiene los tipos de datos de Sequelize.
 * @returns {object} El modelo 'Mesa' inicializado.
 */
export default (sequelize, DataTypes) => {
    const Mesa = sequelize.define('Mesa', {
        // --- Definición de Atributos (Columnas) ---

        mesa_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        numero_mesa: {
            type: DataTypes.INTEGER,
            allowNull: false, // Es obligatorio que cada mesa tenga un número.
            unique: true      // No pueden existir dos mesas con el mismo número.
        },
        estado: {
            // ENUM es un tipo de dato que solo permite valores de una lista predefinida.
            // Esto garantiza la integridad de los datos para el estado de la mesa.
            type: DataTypes.ENUM('disponible', 'ocupada', 'limpieza', 'inactiva'),
            allowNull: false,
            // 'defaultValue' establece un valor por defecto si no se proporciona uno al crear un registro.
            defaultValue: 'disponible'
        }
    }, {
        // --- Opciones Adicionales del Modelo ---

        tableName: 'mesas',
        // *** CAMBIO CLAVE: Habilitar soft delete ***
        timestamps: true,
        paranoid: true,
        deletedAt: 'deleted_at',
        createdAt: false,
        updatedAt: false
    });

    // Este modelo será utilizado en 'index.js' para establecer su asociación
    // 'hasMany' con el modelo Pedido.
    return Mesa;
};