// =================================================================
// ARCHIVO: src/utils/notificationHistory.js
// ROL: Gestiona el historial de notificaciones para el dashboard
//      del administrador, manteniendo los últimos 6 cambios.
// =================================================================

/**
 * Historial de notificaciones para el dashboard
 * Almacena en memoria las últimas notificaciones importantes
 */
class NotificationHistory {
    constructor() {
        this.history = [];
        this.maxHistory = 6;
    }

    /**
     * Agrega una nueva notificación al historial
     * @param {object} notification - Objeto de notificación
     * @param {string} notification.type - Tipo de evento
     * @param {string} notification.message - Mensaje descriptivo
     * @param {object} notification.data - Datos adicionales
     * @param {string} notification.timestamp - Timestamp del evento
     */
    addNotification(notification) {
        // Asegurar que tenga timestamp
        if (!notification.timestamp) {
            notification.timestamp = new Date().toISOString();
        }

        // Agregar al inicio del historial
        this.history.unshift(notification);

        // Mantener solo los últimos maxHistory elementos
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }

        console.log(`Notificación agregada al historial: ${notification.type}`);
    }

    /**
     * Obtiene las últimas notificaciones
     * @param {number} limit - Límite de notificaciones a obtener
     * @returns {Array} Array de notificaciones
     */
    getRecentNotifications(limit = this.maxHistory) {
        return this.history.slice(0, limit);
    }

    /**
     * Limpia el historial de notificaciones
     */
    clearHistory() {
        this.history = [];
        console.log('Historial de notificaciones limpiado');
    }

    /**
     * Crea una notificación estandarizada para un nuevo pedido
     * @param {object} pedido - Datos del pedido
     * @returns {object} Notificación formateada
     */
    createNewPedidoNotification(pedido) {
        return {
            type: 'nuevo_pedido',
            message: `Nuevo pedido #${pedido.pedido_id} creado en mesa ${pedido.Mesa?.numero_mesa || 'N/A'}`,
            data: {
                pedido_id: pedido.pedido_id,
                mesa_id: pedido.mesa_id,
                mesa_numero: pedido.Mesa?.numero_mesa,
                mesero: pedido.Usuario?.nombre,
                estado: pedido.estado
            },
            timestamp: new Date().toISOString(),
            priority: 'high'
        };
    }

    /**
     * Crea una notificación estandarizada para cambio de estado
     * @param {object} pedido - Datos del pedido
     * @param {string} estadoAnterior - Estado anterior del pedido
     * @returns {object} Notificación formateada
     */
    createEstadoNotification(pedido, estadoAnterior) {
        return {
            type: 'cambio_estado_pedido',
            message: `Pedido #${pedido.pedido_id} cambió de "${estadoAnterior}" a "${pedido.estado}"`,
            data: {
                pedido_id: pedido.pedido_id,
                mesa_id: pedido.mesa_id,
                estado_anterior: estadoAnterior,
                estado_nuevo: pedido.estado,
                timestamp: pedido.fecha_actualizacion || new Date().toISOString()
            },
            timestamp: new Date().toISOString(),
            priority: 'medium'
        };
    }

    /**
     * Crea una notificación estandarizada para pedido cancelado
     * @param {object} pedido - Datos del pedido cancelado
     * @returns {object} Notificación formateada
     */
    createCanceladoNotification(pedido) {
        return {
            type: 'pedido_cancelado',
            message: `Pedido #${pedido.pedido_id} fue cancelado`,
            data: {
                pedido_id: pedido.pedido_id,
                mesa_id: pedido.mesa_id,
                mesa_numero: pedido.Mesa?.numero_mesa,
                motivo: 'Cancelado por el sistema'
            },
            timestamp: new Date().toISOString(),
            priority: 'high'
        };
    }
}

// Exportar una instancia única del historial
export const notificationHistory = new NotificationHistory();
