// =================================================================
// ARCHIVO: src/models/refresh_token_session.model.js
// ROL: Define el modelo de sesiones de refresh token para soportar
//      rotación segura, revocación y trazabilidad básica de sesiones.
// =================================================================

export default (sequelize, DataTypes) => {
    const RefreshTokenSession = sequelize.define('RefreshTokenSession', {
        refresh_token_session_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        session_id: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true
        },
        usuario_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        token_hash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        replaced_by_token_hash: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        revoked_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
        user_agent: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        ip_address: {
            type: DataTypes.STRING(64),
            allowNull: true
        }
    }, {
        tableName: 'refresh_token_sessions',
        timestamps: true,
        indexes: [
            { fields: ['usuario_id'] },
            { fields: ['session_id'] },
            { fields: ['token_hash'] },
            { fields: ['expires_at'] },
            { fields: ['revoked_at'] }
        ]
    });

    return RefreshTokenSession;
};
