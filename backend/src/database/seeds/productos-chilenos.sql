-- Productos Típicos Chilenos para Restaurantes
-- Semillas para precargar productos comunes en restaurantes chilenos

-- Limpiar productos existentes (opcional)
-- DELETE FROM products;
-- DELETE FROM categories;

-- Insertar Categorías Típicas Chilenas
INSERT OR IGNORE INTO categories (name, description, active) VALUES
('Entradas', 'Aperitivos y entradas para compartir', 1),
('Empanadas', 'Empanadas tradicionales chilenas', 1),
('Sopas y Cremas', 'Sopas calientes y cremas', 1),
('Platos Principales', 'Platos de fondo tradicionales', 1),
('Parrilla', 'Carnes a la parrilla', 1),
('Mariscos', 'Productos del mar frescos', 1),
('Ensaladas', 'Ensaladas frescas', 1),
('Sándwiches', 'Sándwiches y completos', 1),
('Postres', 'Postres tradicionales chilenos', 1),
('Bebidas', 'Bebidas sin alcohol', 1),
('Jugos Naturales', 'Jugos de frutas frescas', 1),
('Café y Té', 'Café, té e infusiones', 1),
('Bebidas Alcohólicas', 'Vinos, cervezas y licores', 1),
('Para la Once', 'Productos para la once chilena', 1);

-- Insertar Productos Típicos Chilenos

-- ENTRADAS
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Palta Reina', 'Palta rellena con atún, mayonesa y huevo duro', 4500, 1, 1, 50),
('Tabla de Quesos', 'Selección de quesos chilenos con mermeladas', 8900, 1, 1, 30),
('Anticuchos', 'Brochetas de carne marinada a la parrilla', 6200, 1, 1, 40),
('Pebre con Sopaipillas', 'Pebre tradicional chileno con sopaipillas caseras', 3200, 1, 1, 100),
('Machas a la Parmesana', 'Machas gratinadas con queso parmesano', 7800, 1, 1, 25);

-- EMPANADAS
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Empanada de Pino', 'Empanada tradicional de carne, cebolla, huevo y aceituna', 2200, 2, 1, 80),
('Empanada de Queso', 'Empanada rellena de queso derretido', 1800, 2, 1, 60),
('Empanada de Mariscos', 'Empanada con camarones, jaiba y queso', 3500, 2, 1, 40),
('Empanada Napolitana', 'Empanada con jamón, tomate y queso', 2500, 2, 1, 50),
('Empanada de Pollo', 'Empanada rellena de pollo desmenuzado', 2000, 2, 1, 70);

-- SOPAS Y CREMAS
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Cazuela de Cordero', 'Cazuela tradicional chilena con cordero y verduras', 8500, 3, 1, 30),
('Cazuela de Pollo', 'Cazuela de pollo con zapallo, choclo y porotos verdes', 6800, 3, 1, 45),
('Crema de Zapallo', 'Crema suave de zapallo con crutones', 4200, 3, 1, 40),
('Caldillo de Congrio', 'Sopa de congrio con verduras', 9200, 3, 1, 20),
('Sopa de Tortilla', 'Sopa con huevo revuelto en caldo de pollo', 3800, 3, 1, 35);

-- PLATOS PRINCIPALES
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Pastel de Choclo', 'Pastel tradicional con carne, pollo, huevo y choclo', 7500, 4, 1, 25),
('Lomo a lo Pobre', 'Lomo con papas fritas, huevo frito y palta', 12500, 4, 1, 20),
('Churrasco Italiano', 'Churrasco con palta, tomate y mayonesa', 8900, 4, 1, 30),
('Pollo Arvejado', 'Pollo guisado con arvejas y zanahoria', 6800, 4, 1, 35),
('Charquicán', 'Guiso tradicional con charqui, zapallo y papas', 5900, 4, 1, 40),
('Pastel de Papas', 'Capas de papas con carne molida gratinadas', 6500, 4, 1, 30);

-- PARRILLA
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Asado de Tira', 'Costillas de vacuno a la parrilla', 11500, 5, 1, 25),
('Chorizo Argentino', 'Chorizo a la parrilla con chimichurri', 4800, 5, 1, 40),
('Longaniza', 'Longaniza chilena a la parrilla', 4200, 5, 1, 45),
('Anticuchos de Corazón', 'Brochetas de corazón marinado', 5500, 5, 1, 30),
('Parrillada para 2', 'Selección de carnes para compartir', 18900, 5, 1, 15);

-- MARISCOS
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Paila Marina', 'Sopa de mariscos con congrio, choritos y almejas', 14500, 6, 1, 20),
('Curanto', 'Curanto tradicional con mariscos y carnes', 16800, 6, 1, 15),
('Choritos a la Chalaca', 'Choritos con cebolla, tomate y cilantro', 8900, 6, 1, 30),
('Salmón a la Plancha', 'Filete de salmón con salsa de mantequilla', 13200, 6, 1, 25),
('Reineta Frita', 'Reineta rebozada y frita', 9800, 6, 1, 20);

-- ENSALADAS
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Ensalada Chilena', 'Tomate, cebolla y cilantro con aceite y limón', 3200, 7, 1, 60),
('Ensalada de Betarraga', 'Betarraga rallada con cebolla', 2800, 7, 1, 50),
('Ensalada César', 'Lechuga, crutones, parmesano y aderezo césar', 5500, 7, 1, 40),
('Ensalada Mixta', 'Lechuga, tomate, palta y zanahoria', 4200, 7, 1, 45);

-- SÁNDWICHES
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Completo Italiano', 'Vienesa con palta, tomate y mayonesa', 3800, 8, 1, 50),
('Completo As', 'Vienesa con queso americano derretido', 3200, 8, 1, 60),
('Barros Luco', 'Sándwich de carne con queso derretido', 4500, 8, 1, 40),
('Barros Jarpa', 'Sándwich de jamón con queso derretido', 3900, 8, 1, 45),
('Churrasco Palta', 'Churrasco con palta en pan batido', 6500, 8, 1, 35);

-- POSTRES
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Sopaipillas Pasadas', 'Sopaipillas con chancaca', 2800, 9, 1, 40),
('Leche Asada', 'Postre tradicional chileno de leche y huevos', 3500, 9, 1, 30),
('Mote con Huesillos', 'Bebida dulce con mote y duraznos secos', 2200, 9, 1, 50),
('Torta de Mil Hojas', 'Torta de hojaldre con manjar', 4200, 9, 1, 25),
('Flan de Manjar', 'Flan casero con dulce de leche', 3800, 9, 1, 35);

-- BEBIDAS
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Bebida 350ml', 'Coca Cola, Sprite, Fanta', 1800, 10, 1, 100),
('Agua Mineral', 'Agua mineral con o sin gas', 1200, 10, 1, 80),
('Agua Pura', 'Agua purificada 500ml', 800, 10, 1, 120);

-- JUGOS NATURALES
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Jugo de Naranja', 'Jugo natural de naranja recién exprimido', 2500, 11, 1, 60),
('Jugo de Frutilla', 'Jugo natural de frutillas', 2800, 11, 1, 40),
('Jugo de Piña', 'Jugo natural de piña', 2600, 11, 1, 50),
('Jugo Surtido', 'Jugo de frutas mixtas', 2900, 11, 1, 35);

-- CAFÉ Y TÉ
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Café Americano', 'Café negro preparado en cafetera', 1800, 12, 1, 100),
('Café con Leche', 'Café con leche caliente', 2200, 12, 1, 80),
('Cappuccino', 'Café espresso con leche espumada', 2800, 12, 1, 60),
('Té de Boldo', 'Infusión de boldo digestiva', 1500, 12, 1, 50),
('Té Negro', 'Té negro en saquito', 1200, 12, 1, 70);

-- BEBIDAS ALCOHÓLICAS
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Copa de Vino Tinto', 'Vino tinto chileno copa 150ml', 3500, 13, 1, 40),
('Copa de Vino Blanco', 'Vino blanco chileno copa 150ml', 3200, 13, 1, 40),
('Cerveza Nacional', 'Cerveza chilena 330ml', 2800, 13, 1, 60),
('Pisco Sour', 'Cóctel tradicional chileno', 4500, 13, 1, 30),
('Terremoto', 'Cóctel con vino blanco, helado y granadina', 3800, 13, 1, 25);

-- PARA LA ONCE
INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
('Pan Batido', 'Pan fresco para la once', 800, 14, 1, 80),
('Palta', 'Palta fresca para untar', 1500, 14, 1, 60),
('Queso Fresco', 'Queso fresco nacional', 2200, 14, 1, 40),
('Manjar', 'Dulce de leche chileno', 1800, 14, 1, 50),
('Mermelada', 'Mermelada de frutilla o damasco', 1200, 14, 1, 45),
('Kuchen de Manzana', 'Kuchen tradicional alemán-chileno', 3500, 14, 1, 20);

-- Actualizar el stock inicial y precios según temporada
UPDATE products SET stock = 100 WHERE category_id IN (10, 11, 12); -- Bebidas siempre en stock
UPDATE products SET price = price * 1.1 WHERE category_id = 6; -- Mariscos 10% más caros (temporada)

-- Agregar productos especiales de temporada (comentar/descomentar según época)
-- INSERT OR IGNORE INTO products (name, description, price, category_id, active, stock) VALUES
-- ('Sopaipillas de Zapallo', 'Sopaipillas especiales de invierno', 2500, 14, 1, 60),
-- ('Api con Sopaipillas', 'Bebida caliente de maíz morado con sopaipillas', 3200, 10, 1, 40),
-- ('Chicha de Uva', 'Chicha fresca de temporada (septiembre)', 2800, 10, 1, 30);