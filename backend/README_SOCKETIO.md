# Implementación de Socket.IO - Guía de Uso

## Resumen de la Implementación

Se ha implementado Socket.IO en el backend del proyecto Sushi Burrito para proporcionar notificaciones en tiempo real para cocineros, meseros y el dashboard de administrador.

## Características Implementadas

### 1. Sistema de Autenticación
- Verificación de tokens JWT para conexiones Socket.IO
- Asignación automática a salas según el rol del usuario
- Salas disponibles: `cocineros`, `meseros`, `administradores`, `notificaciones_globales`

### 2. Eventos de Notificación

#### **nuevo_pedido**
- Emitido cuando se crea un nuevo pedido
- Enviado a salas: `cocineros`, `meseros`, `administradores`
- Incluye datos completos del pedido con mesa y mesero

#### **cambio_estado_pedido**
- Emitido cuando cambia el estado de un pedido
- Enviado a todas las salas relevantes
- Incluye estado anterior y nuevo

#### **pedido_cancelado**
- Emitido cuando se cancela un pedido
- Enviado a: `notificaciones_globales`, `administradores`

#### **mesa_actualizada**
- Emitido cuando cambia el estado de una mesa
- Enviado a: `meseros`, `administradores`

### 3. Dashboard de Administrador
- Historial de últimos 6 cambios importantes
- Evento `actualizar_dashboard` para actualizaciones en tiempo real
- Almacenamiento en memoria con `NotificationHistory`

## Estructura de Archivos

```
backend/
├── src/
│   ├── socket/
│   │   ├── index.js          # Configuración principal
│   │   ├── middleware.js     # Autenticación JWT
│   │   └── events.js         # Definición de eventos
│   ├── utils/
│   │   └── notificationHistory.js  # Gestión de historial
│   └── controllers/
│       └── pedido.controller.js    # Integración de eventos
├── app.js                    # Servidor HTTP + Socket.IO
└── package.json              # Dependencia socket.io agregada
```

## Uso en el Frontend

### Conexión al Servidor

```javascript
import { io } from 'socket.io-client';

const token = localStorage.getItem('token'); // Token JWT del usuario
const socket = io('http://localhost:3000', {
    auth: {
        token: token
    }
});

socket.on('conexion_confirmada', (data) => {
    console.log('Conectado:', data);
});
```

### Escuchar Eventes

```javascript
// Para cocineros
socket.on('nuevo_pedido', (data) => {
    console.log('Nuevo pedido:', data);
    // Actualizar UI de cocina
});

// Para meseros
socket.on('cambio_estado_pedido', (data) => {
    console.log('Estado actualizado:', data);
    // Actualizar estado en UI del mesero
});

// Para administradores
socket.on('actualizar_dashboard', (data) => {
    console.log('Dashboard update:', data);
    // Actualizar dashboard con últimos cambios
});

// Historial inicial para administradores
socket.on('historial_dashboard', (historial) => {
    console.log('Historial:', historial);
    // Cargar historial inicial
});
```

### Unirse a Salas Específicas

```javascript
// Unirse a sala de un pedido específico
socket.emit('unir_sala_pedido', { pedidoId: 123 });

// Salir de sala de pedido
socket.emit('salir_sala_pedido', { pedidoId: 123 });
```

## Eventos Disponibles

### Emisiones del Servidor
- `conexion_confirmada` - Confirmación de conexión exitosa
- `nuevo_pedido` - Nuevo pedido creado
- `cambio_estado_pedido` - Estado de pedido actualizado
- `pedido_cancelado` - Pedido cancelado
- `mesa_actualizada` - Estado de mesa actualizado
- `actualizar_dashboard` - Actualización para dashboard admin
- `historial_dashboard` - Historial de cambios
- `estado_conexion` - Estado actual de conexión

### Recepciones del Cliente
- `cliente_conectado` - Notificar conexión establecida
- `obtener_historial` - Solicitar historial (solo admin)
- `unir_sala_pedido` - Unirse a sala de pedido
- `salir_sala_pedido` - Abandonar sala de pedido

## Consideraciones de Seguridad

- Todas las conexiones requieren token JWT válido
- Los usuarios solo pueden unirse a salas según su rol
- Los administradores tienen acceso a todas las salas
- Validación de tokens en cada conexión

## Pruebas Recomendadas

1. **Probar conexión por roles**: Verificar que cada rol reciba solo sus eventos
2. **Probar creación de pedidos**: Comprobar notificaciones en tiempo real
3. **Probar cambios de estado**: Validar actualizaciones en todas las vistas
4. **Probar dashboard**: Verificar historial de últimos 6 cambios
5. **Probar desconexiones**: Validar manejo de caídas de conexión

## Configuración del Servidor

El servidor Socket.IO se configura automáticamente al iniciar el backend. Asegúrate de:

1. Tener la dependencia `socket.io` instalada
2. Configurar variable de entorno `FRONTEND_URL` si es necesario
3. Iniciar el servidor con `npm run dev`
El servidor escuchará en el mismo puerto que Express (por defecto 3000) y aceptará conexiones WebSocket y polling.
