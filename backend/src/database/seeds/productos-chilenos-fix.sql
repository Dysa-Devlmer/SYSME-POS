-- Productos Típicos Chilenos para Restaurantes (Versión Corregida)
-- Adaptado a la estructura de base de datos existente

-- Insertar Categorías Típicas Chilenas
INSERT OR IGNORE INTO categories (name, description, is_active) VALUES
('Entradas', 'Aperitivos y entradas para compartir', 1),
('Empanadas', 'Empanadas tradicionales chilenas', 1),
('Sopas y Cremas', 'Sopas calientes y cremas', 1),
('Platos Principales', 'Platos de fondo tradicionales', 1),
('Parrilla', 'Carnes a la parrilla', 1),
('Mariscos', 'Productos del mar frescos', 1),
('Ensaladas', 'Ensaladas frescas', 1),
('Sándwiches', 'Sándwiches y completos', 1),
('Postres', 'Postres tradicionales chilenos', 1),
('Jugos Naturales', 'Jugos de frutas frescas', 1),
('Para la Once', 'Productos para la once chilena', 1);

-- Insertar Productos Típicos Chilenos (usando precios en pesos chilenos)

-- ENTRADAS
INSERT OR IGNORE INTO products (name, description, price, category_id, is_active, stock) VALUES
('Palta Reina', 'Palta rellena con atún, mayonesa y huevo duro', 4500, 6, 1, 50),
('Tabla de Quesos', 'Selección de quesos chilenos con mermeladas', 8900, 6, 1, 30),
('Anticuchos', 'Brochetas de carne marinada a la parrilla', 6200, 6, 1, 40),
('Pebre con Sopaipillas', 'Pebre tradicional chileno con sopaipillas caseras', 3200, 6, 1, 100),
('Machas a la Parmesana', 'Machas gratinadas con queso parmesano', 7800, 6, 1, 25);

-- EMPANADAS
INSERT OR IGNORE INTO products (name, description, price, category_id, is_active, stock) VALUES
('Empanada de Pino', 'Empanada tradicional de carne, cebolla, huevo y aceituna', 2200, 7, 1, 80),
('Empanada de Queso', 'Empanada rellena de queso derretido', 1800, 7, 1, 60),
('Empanada de Mariscos', 'Empanada con camarones, jaiba y queso', 3500, 7, 1, 40),
('Empanada Napolitana', 'Empanada con jamón, tomate y queso', 2500, 7, 1, 50),
('Empanada de Pollo', 'Empanada rellena de pollo desmenuzado', 2000, 7, 1, 70);

-- SOPAS Y CREMAS
INSERT OR IGNORE INTO products (name, description, price, category_id, is_active, stock) VALUES
('Cazuela de Cordero', 'Cazuela tradicional chilena con cordero y verduras', 8500, 8, 1, 30),
('Cazuela de Pollo', 'Cazuela de pollo con zapallo, choclo y porotos verdes', 6800, 8, 1, 45),
('Crema de Zapallo', 'Crema suave de zapallo con crutones', 4200, 8, 1, 40),
('Caldillo de Congrio', 'Sopa de congrio con verduras', 9200, 8, 1, 20),
('Sopa de Tortilla', 'Sopa con huevo revuelto en caldo de pollo', 3800, 8, 1, 35);

-- PLATOS PRINCIPALES
INSERT OR IGNORE INTO products (name, description, price, category_id, is_active, stock) VALUES
('Pastel de Choclo', 'Pastel tradicional con carne, pollo, huevo y choclo', 7500, 9, 1, 25),
('Lomo a lo Pobre', 'Lomo con papas fritas, huevo frito y palta', 12500, 9, 1, 20),
('Churrasco Italiano', 'Churrasco con palta, tomate y mayonesa', 8900, 9, 1, 30),
('Pollo Arvejado', 'Pollo guisado con arvejas y zanahoria', 6800, 9, 1, 35),
('Charquicán', 'Guiso tradicional con charqui, zapallo y papas', 5900, 9, 1, 40),
('Pastel de Papas', 'Capas de papas con carne molida gratinadas', 6500, 9, 1, 30);

-- PARRILLA
INSERT OR IGNORE INTO products (name, description, price, category_id, is_active, stock) VALUES
('Asado de Tira', 'Costillas de vacuno a la parrilla', 11500, 10, 1, 25),
('Chorizo Argentino', 'Chorizo a la parrilla con chimichurri', 4800, 10, 1, 40),
('Longaniza', 'Longaniza chilena a la parrilla', 4200, 10, 1, 45),
('Anticuchos de Corazón', 'Brochetas de corazón marinado', 5500, 10, 1, 30),
('Parrillada para 2', 'Selección de carnes para compartir', 18900, 10, 1, 15);

-- MARISCOS
INSERT OR IGNORE INTO products (name, description, price, category_id, is_active, stock) VALUES
('Paila Marina', 'Sopa de mariscos con congrio, choritos y almejas', 14500, 11, 1, 20),
('Curanto', 'Curanto tradicional con mariscos y carnes', 16800, 11, 1, 15),
('Choritos a la Chalaca', 'Choritos con cebolla, tomate y cilantro', 8900, 11, 1, 30),
('Salmón a la Plancha', 'Filete de salmón con salsa de mantequilla', 13200, 11, 1, 25),
('Reineta Frita', 'Reineta rebozada y frita', 9800, 11, 1, 20);

-- ENSALADAS
INSERT OR IGNORE INTO products (name, description, price, category_id, is_active, stock) VALUES
('Ensalada Chilena', 'Tomate, cebolla y cilantro con aceite y limón', 3200, 12, 1, 60),
('Ensalada de Betarraga', 'Betarraga rallada con cebolla', 2800, 12, 1, 50),
('Ensalada César', 'Lechuga, crutones, parmesano y aderezo césar', 5500, 12, 1, 40),
('Ensalada Mixta', 'Lechuga, tomate, palta y zanahoria', 4200, 12, 1, 45);

-- SÁNDWICHES
INSERT OR IGNORE INTO products (name, description, price, category_id, is_active, stock) VALUES
('Completo Italiano', 'Vienesa con palta, tomate y mayonesa', 3800, 13, 1, 50),
('Completo As', 'Vienesa con queso americano derretido', 3200, 13, 1, 60),
('Barros Luco', 'Sándwich de carne con queso derretido', 4500, 13, 1, 40),
('Barros Jarpa', 'Sándwich de jamón con queso derretido', 3900, 13, 1, 45),
('Churrasco Palta', 'Churrasco con palta en pan batido', 6500, 13, 1, 35);

-- POSTRES
INSERT OR IGNORE INTO products (name, description, price, category_id, is_active, stock) VALUES
('Sopaipillas Pasadas', 'Sopaipillas con chancaca', 2800, 14, 1, 40),
('Leche Asada', 'Postre tradicional chileno de leche y huevos', 3500, 14, 1, 30),
('Mote con Huesillos', 'Bebida dulce con mote y duraznos secos', 2200, 14, 1, 50),
('Torta de Mil Hojas', 'Torta de hojaldre con manjar', 4200, 14, 1, 25),
('Flan de Manjar', 'Flan casero con dulce de leche', 3800, 14, 1, 35);

-- JUGOS NATURALES
INSERT OR IGNORE INTO products (name, description, price, category_id, is_active, stock) VALUES
('Jugo de Naranja', 'Jugo natural de naranja recién exprimido', 2500, 15, 1, 60),
('Jugo de Frutilla', 'Jugo natural de frutillas', 2800, 15, 1, 40),
('Jugo de Piña', 'Jugo natural de piña', 2600, 15, 1, 50),
('Jugo Surtido', 'Jugo de frutas mixtas', 2900, 15, 1, 35);

-- PARA LA ONCE
INSERT OR IGNORE INTO products (name, description, price, category_id, is_active, stock) VALUES
('Pan Batido', 'Pan fresco para la once', 800, 16, 1, 80),
('Palta', 'Palta fresca para untar', 1500, 16, 1, 60),
('Queso Fresco', 'Queso fresco nacional', 2200, 16, 1, 40),
('Manjar', 'Dulce de leche chileno', 1800, 16, 1, 50),
('Mermelada', 'Mermelada de frutilla o damasco', 1200, 16, 1, 45),
('Kuchen de Manzana', 'Kuchen tradicional alemán-chileno', 3500, 16, 1, 20);