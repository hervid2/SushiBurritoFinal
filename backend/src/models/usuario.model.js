import bcrypt from 'bcryptjs';

export default (sequelize, DataTypes) => {
    const Usuario = sequelize.define('Usuario', {
        usuario_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        nombre: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        rol_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        correo: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },
        contraseña: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        must_change_password: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        // 🔥 AGREGAMOS ESTE CAMPO (Faltaba en tu código)
        is_deleted: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    // ... (resto del código igual hasta las opciones del modelo)
    }, {
        tableName: 'usuarios',
        timestamps: true,
        paranoid: true,
        
        // 🔥 MAPEO CORRECTO DE COLUMNAS:
        // 'Nombre en Sequelize': 'Nombre real en MySQL'
        createdAt: 'createdAt',  // Cambiado de 'created_at' a 'createdAt'
        updatedAt: 'updatedAt',  // Asegúrate de que coincida con tu tabla
        deletedAt: 'deleted_at', // Este parece estar bien según tus capturas
        
        hooks: {
            // ... (tus hooks de bcrypt)
        }
    });

    return Usuario;
};