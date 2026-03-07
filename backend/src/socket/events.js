// =================================================================
// ARCHIVO: src/socket/events.js
// ROL: Definición de eventos y manejadores de Socket.IO
//      Centraliza toda la lógica de eventos en tiempo real.
// =================================================================

import { notificationHistory } from '../utils/notificationHistory.js';

/**
 * Registra todos los manejadores de eventos para un socket
 * @param {object} io - Instancia de Socket.IO
 * @param {object} socket - Socket del cliente
 */
export const registerSocketEvents = (io, socket) => {
    
    /**
     * Evento: cliente_conectado
     * Se dispara cuando un cliente se conecta exitosamente
     */
    socket.on('cliente_conectado', () => {
        console.log(`Cliente conectado: ${socket.userName} (${socket.id})`);
        
        // Enviar confirmación de conexión
        socket.emit('conexion_confirmada', {
            message: 'Conectado exitosamente al servidor de notificaciones',
            userId: socket.userId,
            userRol: socket.userRol,
            timestamp: new Date().toISOString()
        });

        // Si es administrador, enviar historial reciente
        if (socket.userRol === 'administrador') {
            const historial = notificationHistory.getRecentNotifications();
            socket.emit('historial_dashboard', historial);
        }
    });

    /**
     * Evento: obtener_historial
     * Permite a los administradores solicitar el historial actualizado
     */
    socket.on('obtener_historial', () => {
        if (socket.userRol === 'administrador') {
            const historial = notificationHistory.getRecentNotifications();
            socket.emit('historial_dashboard', historial);
        } else {
            socket.emit('error', { message: 'No autorizado para obtener historial' });
        }
    });

    /**
     * Evento: unir_sala_pedido
     * Permite unirse a una sala específica de un pedido
     */
    socket.on('unir_sala_pedido', (data) => {
        const { pedidoId } = data;
        
        if (pedidoId) {
            socket.join(`pedido_${pedidoId}`);
            socket.emit('sala_unida', { 
                message: `Unido a la sala del pedido ${pedidoId}`,
                sala: `pedido_${pedidoId}`
            });
        }
    });

    /**
     * Evento: salir_sala_pedido
     * Permite salir de una sala específica de un pedido
     */
    socket.on('salir_sala_pedido', (data) => {
        const { pedidoId } = data;
        
        if (pedidoId) {
            socket.leave(`pedido_${pedidoId}`);
            socket.emit('sala_abandonada', { 
                message: `Abandonada la sala del pedido ${pedidoId}`,
                sala: `pedido_${pedidoId}`
            });
        }
    });

    /**
     * Evento: disconnect
     * Se dispara cuando un cliente se desconecta
     */
    socket.on('disconnect', (reason) => {
        console.log(`Cliente desconectado: ${socket.userName} (${socket.id}) - Razón: ${reason}`);
    });

    /**
     * Evento: error
     * Maneja errores de conexión
     */
    socket.on('error', (error) => {
        console.error(`Error en socket ${socket.id}:`, error);
    });
};

/**
 * Emite un evento de nuevo pedido a las salas correspondientes
 * @param {object} io - Instancia de Socket.IO
 * @param {object} pedido - Datos del pedido creado
 */
export const emitNuevoPedido = (io, pedido) => {
    const notification = notificationHistory.createNewPedidoNotification(pedido);
    
    // Agregar al historial
    notificationHistory.addNotification(notification);
    
    // Emitir a cocineros
    io.to('cocineros').emit('nuevo_pedido', {
        type: 'nuevo_pedido',
        message: `Nuevo pedido recibido - Mesa ${pedido.Mesa?.numero_mesa || 'N/A'}`,
        data: notification.data,
        timestamp: notification.timestamp
    });

    // Emitir a meseros
    io.to('meseros').emit('nuevo_pedido', {
        type: 'nuevo_pedido',
        message: `Pedido creado - Mesa ${pedido.Mesa?.numero_mesa || 'N/A'}`,
        data: notification.data,
        timestamp: notification.timestamp
    });

    // Emitir a administradores para dashboard
    io.to('administradores').emit('actualizar_dashboard', notification);

    console.log(`Evento 'nuevo_pedido' emitido para pedido #${pedido.pedido_id}`);
};

/**
 * Emite un evento de cambio de estado de pedido
 * @param {object} io - Instancia de Socket.IO
 * @param {object} pedido - Datos del pedido actualizado
 * @param {string} estadoAnterior - Estado anterior del pedido
 */
export const emitCambioEstado = (io, pedido, estadoAnterior) => {
    const notification = notificationHistory.createEstadoNotification(pedido, estadoAnterior);
    
    // Agregar al historial
    notificationHistory.addNotification(notification);
    
    // Emitir a todas las salas relevantes
    io.to('cocineros').emit('cambio_estado_pedido', {
        type: 'cambio_estado_pedido',
        message: `Pedido #${pedido.pedido_id} ahora está "${pedido.estado}"`,
        data: notification.data,
        timestamp: notification.timestamp
    });

    io.to('meseros').emit('cambio_estado_pedido', {
        type: 'cambio_estado_pedido',
        message: `Pedido #${pedido.pedido_id} actualizado a "${pedido.estado}"`,
        data: notification.data,
        timestamp: notification.timestamp
    });

    // Emitir a sala específica del pedido
    io.to(`pedido_${pedido.pedido_id}`).emit('cambio_estado_pedido', {
        type: 'cambio_estado_pedido',
        message: `Tu pedido cambió a "${pedido.estado}"`,
        data: notification.data,
        timestamp: notification.timestamp
    });

    // Actualizar dashboard de administradores
    io.to('administradores').emit('actualizar_dashboard', notification);

    console.log(`Evento 'cambio_estado_pedido' emitido para para pedido #${pedido.pedido_id}`);
};

/**
 * Emite un evento de pedido cancelado
 * @param {object} io - Instancia de Socket.IO
 * @param {object} pedido - Datos del pedido cancelado
 */
export const emitPedidoCancelado = (io, pedido) => {
    const notification = notificationHistory.createCanceladoNotification(pedido);
    
    // Agregar al historial
    notificationHistory.addNotification(notification);
    
    // Emitir a todas las salas
    io.to('notificaciones_globales').emit('pedido_cancelado', {
        type: 'pedido_cancelado',
        message: `Pedido #${pedido.pedido_id} ha sido cancelado`,
        data: notification.data,
        timestamp: notification.timestamp
    });

    // Actualizar dashboard
    io.to('administradores').emit('actualizar_dashboard', notification);

    console.log(`Evento 'pedido_cancelado' emitido para para pedido #${pedido.pedido_id}`);
};

/**
 * Emite un evento de actualización de mesa
 * @param {object} io - Instancia de Socket.IO
 * @param {object} mesa - Datos de la mesa actualizada
 */
export const emitMesaActualizada = (io, mesa) => {
    const notification = {
        type: 'mesa_actualizada',
        message: `Mesa ${mesa.numero_mesa} ahora está "${mesa.estado}"`,
        data: {
            mesa_id: mesa.mesa_id,
            numero_mesa: mesa.numero_mesa,
            estado: mesa.estado
        },
        timestamp: new Date().toISOString(),
        priority: 'low'
    };

    // Emitir a meseros y administradores
    io.to('meseros').emit('mesa_actualizada', notification);
    io.to('administradores').emit('mesa_actualizada', notification);

    console.log(`Evento 'mesa_actualizada' emitido para para mesa ${mesa.numero_mesa}`);
};
