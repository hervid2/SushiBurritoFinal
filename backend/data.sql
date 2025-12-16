-- Crear el usuario
CREATE USER if not exists 'sushiBurrito'@'localhost' IDENTIFIED BY '';

#Creamos la base de datos
CREATE DATABASE sushiBurritoJS_DB CHARACTER SET utf8mb4;

#Asignamos la base de datos al usuario y le damos todos los permisos
GRANT ALL PRIVILEGES ON sushiBurritoJS_DB.* TO "sushiBurrito"@"localhost";

#Refrescamos los permisos de todo el sistema
FLUSH PRIVILEGES;

-- seleccionamos la base de datos
use sushiBurritoJS_DB;

--  -----------------------------------------------
#Scripts para la creación de las diferentes tablas:
--  -----------------------------------------------

-- 1. Tabla categorias: Para categorizar los productos
-- No tiene dependencias externas.
CREATE TABLE categorias (
  categoria_id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE COMMENT 'Define tipos de categorías de productos.'
);

-- 2. Tabla usuarios: Almacena información de los empleados del sistema 
-- Depende de 'roles'.
CREATE TABLE usuarios (
  usuario_id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  rol_id INT,  -- Se reemplaza el ENUM
  correo VARCHAR(100) UNIQUE,
  contraseña VARCHAR(255) NOT NULL,
  FOREIGN KEY (rol_id) REFERENCES roles(rol_id)
);
-- actualizcion de la tabla usuarios con soft delete
alter table usuarios
ADD COLUMN is_deleted TINYINT(1) DEFAULT 0,
ADD COLUMN deleted_at datetime NULL ;

-- 3.  Tabla para definir los roles del sistema
CREATE TABLE roles (
  rol_id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_rol VARCHAR(50) NOT NULL UNIQUE COMMENT 'Ej: administrador, mesero'
);

-- 4. Tabla productos: Cada platillo o artículo del menú.
-- Depende de 'categorias'.
CREATE TABLE productos (
  producto_id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_producto VARCHAR(100) NOT NULL COMMENT 'Nombre del producto o platillo.',
  descripcion_ingredientes TEXT COMMENT 'Descripción de los ingredientes o del platillo.',
  valor_neto DECIMAL(10,2) NOT NULL COMMENT 'Precio base del producto sin impuestos.',
  categoria_id INT,
  FOREIGN KEY (categoria_id) REFERENCES categorias(categoria_id)
);
-- actualizacion de la tabla productos con sof delete
alter table productos
ADD COLUMN is_deleted TINYINT(1) DEFAULT 0,
ADD COLUMN deleted_at datetime NULL ;


-- 5. Tabla mesas: Para la gestión de las mesas del restaurante.
-- No tiene dependencias externas.
CREATE TABLE mesas (
  mesa_id INT AUTO_INCREMENT PRIMARY KEY,
  numero_mesa INT NOT NULL UNIQUE COMMENT 'Número único de la mesa.',
  estado ENUM('disponible','ocupada','limpieza','inactiva') NOT NULL DEFAULT 'disponible' COMMENT 'Estado actual de la mesa.'
);

-- 6. Tabla pedidos: Representa un pedido realizado en una mesa.
-- Depende de 'usuarios' (para el mesero que tomó el pedido) y 'mesas'.
CREATE TABLE pedidos (
  pedido_id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT COMMENT 'ID del mesero que tomó el pedido.',
  mesa_id INT COMMENT 'ID de la mesa asociada al pedido.',
  estado varchar(50) NOT NULL DEFAULT 'pendiente' COMMENT 'Estado de preparación y pago del pedido',
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de creación del pedido.',
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última fecha y hora de modificación del pedido, se actualiza automáticamente.',
  FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id),
  FOREIGN KEY (mesa_id) REFERENCES mesas(mesa_id)
);

-- 7. Tabla detalle_pedido: Contiene los productos específicos de cada pedido.
-- Es la tabla pivote entre 'pedidos' y 'productos'.
-- Depende de 'pedidos' y 'productos'.
CREATE TABLE detalle_pedido (
  detalle_id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT,
  producto_id INT,
  cantidad INT NOT NULL CHECK (cantidad > 0) COMMENT 'Cantidad del producto en el pedido (debe ser mayor a 0).',
  notas TEXT COMMENT 'Notas adicionales para este producto específico (ej. "sin cebolla").',
  FOREIGN KEY (producto_id) REFERENCES productos(producto_id),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(pedido_id) ON DELETE CASCADE
);

-- 8. Tabla metodos_pago: Para registrar los diferentes métodos de pago aceptados.
-- No tiene dependencias externas.
CREATE TABLE metodos_pago (
  metodo_pago_id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_metodo VARCHAR(50) NOT NULL UNIQUE COMMENT 'Nombre del método de pago (ej. Efectivo, Tarjeta de Crédito, Transferencia).'
);

-- 9. Tabla facturas: Almacena el resumen de las transacciones de pago.
-- Depende de 'pedidos' y 'metodos_pago'.
CREATE TABLE facturas (
  factura_id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT UNIQUE,
  metodo_pago_id INT,
  subtotal DECIMAL(10,2) NOT NULL,
  impuesto_total DECIMAL(10,2) NOT NULL,
  propina DECIMAL(10, 2) NULL DEFAULT 0.0,
  total DECIMAL(10,2) NOT NULL,
  fecha_factura DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(pedido_id),
  FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(metodo_pago_id)
);

-- 10. Tabla para registrar los pagos de una factura, permitiendo múltiples métodos
-- Depende de 'metodos_pago' y 'facturas'
CREATE TABLE transacciones_pago (
  transaccion_id INT AUTO_INCREMENT PRIMARY KEY,
  factura_id INT,
  metodo_pago_id INT,
  monto_pagado DECIMAL(10, 2) NOT NULL COMMENT 'Monto específico pagado con este método.',
  FOREIGN KEY (factura_id) REFERENCES facturas(factura_id),
  FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(metodo_pago_id)
);

--  -----------------------------------------------
#scripts iniciales para manipular la DB:
--  -----------------------------------------------

show tables;

describe productos;
describe categorias;
describe usuarios;
describe roles;
describe facturas;
describe pedidos;
describe detalle_pedido;
describe mesas;
describe metodos_pago;
describe transacciones_pago;

select * from categorias;
select * from usuarios;
select * from roles;
select * from productos;
select * from pedidos;
select * from detalle_pedido;
select * from facturas;
select * from mesas;
select * from metodos_pago;
select * from transacciones_pago;

-- insertar las mesas iniciales
INSERT INTO mesas (numero_mesa) VALUES
(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12);

-- Insertar los métodos de pago iniciales
INSERT INTO metodos_pago (nombre_metodo) VALUES
('Tarjeta Crédito'),
('Tarjeta Débito'),
('Efectivo'),
('Nequi'),
('Daviplata'),
('Transferencia bancaria');

-- Insertar roles iniciales
INSERT INTO roles (nombre_rol) VALUES
('administrador'),
('mesero'),
('cocinero');

-- Insertar datos en la tabla de categorías (si no existen)
INSERT IGNORE INTO categorias (categoria_id, nombre) VALUES
(4, 'Entradas'),
(1, 'Infantil'),
(5, 'Platos Fuertes'),
(3, 'Postres'),
(2, 'Bebidas'),
(6, 'Acompañamientos'),
(13, 'vegano');

-- Insertar productos de Entradas
INSERT INTO productos (nombre_producto, descripcion_ingredientes, valor_neto, categoria_id) VALUES
('LANGOSTINOS TEMPURA', 'Langostinos tempurizados acompañados de salsas de la casa.', 17900.00, 4),
('LANGOSTINOS SAMURAI', 'Langostinos tempurizados, con champiñones en queso mozzarella y nachos.', 23800.00, 4),
('PALMITOS CRUNCHY TOKYO', 'Palmitos crocantes rellenos de queso crema, en una cama de aguacate.', 19800.00, 4),
('CHICHARRÓN DE PESCADO', 'Tilapia freída en cubos, papa criolla tempurizada y dip de salsa picante.', 24900.00, 4);

-- Insertar productos de Platos Fuertes
INSERT INTO productos (nombre_producto, descripcion_ingredientes, valor_neto, categoria_id) VALUES
('AMERICAN CHICKEN', 'Nuggets de pollo de la casa, tocineta, yuca en croqueta, mix de lechugas, pepino en rodajas, cebolla caramelizada, queso cheddar, aguacate, queso crema, arroz de sushi, alga nori.', 29700.00, 5),
('KARATE CHICKEN', 'Pollo en salsa teriyaki con vegetales al wok (pimentón verde, pimentón rojo, cebolla roja, zanahoria en julianas) papa criolla, semillas de sésamo, tomates cherry, aguacate en tajadas, queso crema, arroz de sushi, alga nori.', 30800.00, 5),
('CHANCHO POWER', 'Bondiola de cerdo desmechada en salsa bbq, mix de lechugas, calabacín, papa criolla, cebolla grillé, chicharrones carnudos, guacate, maíz tierno, queso crema, arroz de sushi, alga nori.', 33500.00, 5),
('EL MÁS CHIDO', 'Carne molida de res con salsa bbq, mix de lechugas, queso mozzarella rallado, maíz tierno, aguacate, pico de gallo, nachos picados, queso crema, arroz de sushi, alga nori.', 33500.00, 5),
('EL KAPPO (De la casa)', 'Langostinos tempurizados, palmito de cangrejo picado, zanahoria en julianas, calabacín en julianas, mix de lechugas, mango, aguacate, queso crema, arroz de sushi, alga nori.', 34500.00, 5),
('EBI', 'Palmito de cangrejo crujiente, camarones, mix de lechugas, zanahoria en julianas, pepino en bastones, aguacate en tajadas, queso crema, arroz de sushi, y alga nori.', 34500.00, 5),
('EL TUNA SALMÓN', 'Salmón fresco en cubos, atún fresco en cubos, mix de lechugas, zanahoria en julianas, pepino en bastones, queso mozzarella en tajadas, aguacate, mango, queso crema, arroz de sushi, alga nori.', 38800.00, 5),
('NINJA CRUNCH', 'Salmón tempurizado en cubos con vegetales al wok (pimentón, cebolla roja, zanahoria en julianas) en salsa teriyaki, langostino tempurizado, mix de lechugas, piel de salmón crocante, aguacate, trocitos de jengibre, tocineta, queso crema, arroz de sushi, alga nori.', 38880.00, 5),
('PICANTE TIGRE SIBERIANO', 'Camarones en salsa picante, palmito de cangrejo desmechado, tocineta, aguacate, arroz de sushi y alga nori, nachos.', 42700.00, 5),
('LEOPARDO', 'Bondiola desmechada con hogao, chorizo picante, tomate Cherry, maduro caramelizado, queso cheddar, aguacate, mix de lechugas, arroz de sushi y alga nori.', 39600.00, 5),
('JUNIOR TRADICIONAL CARNÍVORO', 'Carne molida de res ó carne de cerdo (la que el cliente prefiera), maíz tierno, aguacate, nachos o papa criolla (lo que el cliente prefiera) queso crema, pico de gallo, queso cheddar, queso mozzarella, arroz de sushi.', 32900.00, 5),
('JUNIOR TRADICIONAL KATANA BAKANA', 'Langostinos tempurizados, tilapia en cubos, mezcla de vegetales al wok (espinaca, zanahoria, pepino, calabacín amarillo, y cilantro), champiñones, croquetas de yuca, aguacate, repollo morado, arroz de sushi.', 33700.00, 5),
('JUNIOR TRADICIONAL MONTE FUJI', 'Camarones, palmitos en cubos crujientes, tomate cherry, aguacate, fresas, calabacín, queso cheddar, arroz de sushi.', 34500.00, 5),
('JUNIOR TRADICIONAL SALMÓN EMPERADOR', 'Salmón fresco en cubos, palmito de cangrejo picado, pepino en rodajas, aguacate, zanahoria, repollo morado, queso mozzarella en cubos, arándanos, arroz de sushi, jengibre.', 34500.00, 5);

-- Insertar productos Veganos
INSERT INTO productos (nombre_producto, descripcion_ingredientes, valor_neto, categoria_id) VALUES
('VEGGIE', 'Tofu en cubos apanados, champiñones salteados con pimentón y cebolla roja, maíz tierno, aguacate, mix de lechugas, zanahoria en julianas, tomate cherry, arroz de sushi, alga nori.', 33800.00, 13);

-- Insertar productos Infantiles
INSERT INTO productos (nombre_producto, descripcion_ingredientes, valor_neto, categoria_id) VALUES
('NUGGETS DE POLLO', 'Nuggets de pollo acompañados con papas a la francesa.', 23800.00, 1),
('PICADITA JUNIOR', 'Pollo en cuadritos, palmito apanado y/o albóndigas de carne de res, en cama de yuca frita, o papas a la francesa, o papa criolla.', 24500.00, 1);

-- Insertar Postres
INSERT INTO productos (nombre_producto, descripcion_ingredientes, valor_neto, categoria_id) VALUES
('BROWNIE CON HELADO', 'Brownie acompañado de helado.', 10800.00, 3),
('HELADO FRITO', 'Helado frito crujiente.', 16900.00, 3);

-- Insertar Acompañamientos
INSERT INTO productos (nombre_producto, descripcion_ingredientes, valor_neto, categoria_id) VALUES
('NACHOS', 'Nachos crocantes.', 7000.00, 6),
('CROQUETAS DE YUCA', 'Croquetas de yuca fritas.', 8500.00, 6),
('PAPA CRIOLLA', 'Papa criolla frita.', 8500.00, 6),
('PAPAS A LA FRANCESA', 'Papas fritas estilo francés.', 8500.00, 6),
('ADICIONAL DE TEMPURA', 'Extra de tempura.', 2500.00, 6);

-- Insertar Bebidas
INSERT INTO productos (nombre_producto, descripcion_ingredientes, valor_neto, categoria_id) VALUES
('GRANIZADA LIMÓN', 'Bebida granizada de limón.', 7500.00, 2),
('GRANIZADA NARANJA', 'Bebida granizada de naranja.', 8000.00, 2),
('GRANIZADA MANDARINA', 'Bebida granizada de mandarina.', 8000.00, 2),
('GRANIZADA MARACUMANGO', 'Bebida granizada de maracuyá y mango.', 9000.00, 2),
('TÉ TROPICAL DE JAMAICA', 'Té de flor de jamaica.', 9000.00, 2),
('GRANIZADA MANGO PIÑA CEREZA', 'Bebida granizada de mango, piña y cereza.', 9000.00, 2),
('LIMONADA DE YERBABUENA', 'Limonada con hierbabuena.', 9000.00, 2),
('GRANIZADA MANGO YERBABUENA', 'Bebida granizada de mango con hierbabuena.', 9000.00, 2),
('LIMONADA DE PATILLA', 'Limonada de patilla (sandía).', 9000.00, 2),
('GRANIZADO DE COCO', 'Bebida granizada de coco.', 13000.00, 2),
('SODAS DE FRUTAS', 'Soda de frutas variadas.', 11800.00, 2),
('AGUA', 'Agua mineral.', 5500.00, 2),
('AGUA CON GAS', 'Agua mineral con gas.', 5500.00, 2),
('GASEOSA PERSONAL', 'Gaseosa en tamaño personal.', 6000.00, 2),
('SODA', 'Soda tradicional.', 6000.00, 2),
('TE HATSU', 'Té Hatsu especial.', 9000.00, 2),
('HATSU SODA', 'Soda Hatsu.', 7500.00, 2),
('CERVEZA CLUB COLOMBIA', 'Cerveza Club Colombia.', 9000.00, 2),
('CERVEZA CORONA', 'Cerveza Corona.', 9500.00, 2),
('CERVEZA CORONITA', 'Cerveza Coronita.', 8000.00, 2),
('CERVEZA HEINEKEN', 'Cerveza Heineken.', 9500.00, 2),
('MICHELADA', 'Michelada tradicional.', 4000.00, 2);

