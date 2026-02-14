// =================================================================
// ARCHIVO: src/models/producto.model.js
// ROL: Define el modelo de Sequelize para la tabla 'productos'.
//      Este modelo representa cada ítem individual del menú
//      que el restaurante ofrece.
// =================================================================

/**
 * Define y exporta el modelo 'Producto' de Sequelize.
 *
 * @param {object} sequelize - La instancia de conexión de Sequelize.
 * @param {object} DataTypes - El objeto que contiene los tipos de datos de Sequelize.
 * @returns {object} El modelo 'Producto' inicializado.
 */

export default (sequelize, DataTypes) => {
    const Producto = sequelize.define('Producto', {

        producto_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        nombre_producto: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        descripcion_ingredientes: {
            type: DataTypes.TEXT
        },
        valor_neto: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        categoria_id: {
            type: DataTypes.INTEGER
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        deleted_at: {                 
            type: DataTypes.DATE,
            allowNull: true
        }

    }, {
        tableName: 'productos',
        timestamps: false
    });

    return Producto;
};

