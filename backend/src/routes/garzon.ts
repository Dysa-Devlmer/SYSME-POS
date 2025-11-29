import { Router } from 'express';
import { DatabaseAdapter } from '../legacy-adapter';

const router = Router();
const db = new DatabaseAdapter();

/**
 * Interfaz específica para terminales de garzón
 * Optimizada para ser ligera y rápida
 */

// Middleware para identificar terminal
router.use((req, res, next) => {
    req.terminalInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
    };
    next();
});

/**
 * Dashboard para garzón - Vista optimizada
 */
router.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYSME TPV - Terminal Garzón</title>
    <style>
        :root {
            --primary: #2c3e50;
            --success: #27ae60;
            --warning: #f39c12;
            --danger: #e74c3c;
            --info: #3498db;
            --light: #ecf0f1;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--light);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            background: var(--primary);
            color: white;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .status {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--success);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .main-content {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 1.5rem;
            padding: 1.5rem;
            overflow: hidden;
        }
        
        .left-panel {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        
        .card {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .card-header {
            background: var(--primary);
            color: white;
            padding: 1rem;
            font-weight: 600;
        }
        
        .card-body {
            padding: 1.5rem;
        }
        
        .mesas-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 1rem;
        }
        
        .mesa-card {
            background: var(--light);
            border: 2px solid transparent;
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .mesa-card:hover {
            border-color: var(--info);
            background: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.2);
        }
        
        .mesa-card.ocupada {
            background: #fff3cd;
            border-color: var(--warning);
        }
        
        .mesa-card.selected {
            background: #d4edda;
            border-color: var(--success);
        }
        
        .mesa-numero {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--primary);
            margin-bottom: 0.5rem;
        }
        
        .mesa-info {
            font-size: 0.8rem;
            color: #666;
        }
        
        .productos-section {
            flex: 1;
        }
        
        .productos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 1rem;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .producto-card {
            background: var(--light);
            border: 2px solid transparent;
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .producto-card:hover {
            border-color: var(--success);
            background: white;
            transform: translateY(-2px);
        }
        
        .producto-nombre {
            font-weight: 600;
            color: var(--primary);
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
        }
        
        .producto-precio {
            color: var(--success);
            font-size: 1.1rem;
            font-weight: bold;
        }
        
        .cocina-badge {
            background: var(--warning);
            color: white;
            font-size: 0.7rem;
            padding: 0.2rem 0.5rem;
            border-radius: 10px;
            display: inline-block;
            margin-top: 0.3rem;
        }
        
        .right-panel {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .ticket-section {
            flex: 1;
        }
        
        .ticket-items {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .ticket-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.8rem 0;
            border-bottom: 1px solid var(--light);
        }
        
        .ticket-item:last-child {
            border-bottom: none;
        }
        
        .item-details {
            flex: 1;
        }
        
        .item-name {
            font-weight: 500;
            color: var(--primary);
        }
        
        .item-qty {
            color: #666;
            font-size: 0.9rem;
        }
        
        .item-price {
            color: var(--success);
            font-weight: bold;
        }
        
        .ticket-total {
            background: var(--primary);
            color: white;
            padding: 1rem;
            margin: 1rem -1.5rem -1.5rem;
            text-align: center;
        }
        
        .total-amount {
            font-size: 1.5rem;
            font-weight: bold;
        }
        
        .btn {
            padding: 0.8rem 1.5rem;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-success { background: var(--success); color: white; }
        .btn-info { background: var(--info); color: white; }
        .btn-warning { background: var(--warning); color: white; }
        .btn-danger { background: var(--danger); color: white; }
        
        .btn:hover {
            transform: translateY(-1px);
            opacity: 0.9;
        }
        
        .btn-group {
            display: flex;
            gap: 0.5rem;
        }
        
        .quick-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        
        @media (max-width: 768px) {
            .main-content {
                grid-template-columns: 1fr;
            }
            
            .header {
                padding: 1rem;
            }
            
            .header h1 {
                font-size: 1.2rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍽️ SYSME TPV - Terminal Garzón</h1>
        <div class="status">
            <div class="status-dot"></div>
            <span>Conectado al Servidor</span>
            <span id="terminal-name"></span>
        </div>
    </div>
    
    <div class="main-content">
        <div class="left-panel">
            <!-- Selección de Mesa -->
            <div class="card">
                <div class="card-header">🪑 Seleccionar Mesa</div>
                <div class="card-body">
                    <div class="mesas-grid" id="mesas-grid">
                        <!-- Las mesas se cargarán aquí -->
                    </div>
                </div>
            </div>
            
            <!-- Productos -->
            <div class="card productos-section">
                <div class="card-header">🍕 Productos del Menú</div>
                <div class="card-body">
                    <div class="productos-grid" id="productos-grid">
                        <!-- Los productos se cargarán aquí -->
                    </div>
                </div>
            </div>
        </div>
        
        <div class="right-panel">
            <!-- Ticket Actual -->
            <div class="card ticket-section">
                <div class="card-header">🧾 Pedido Actual</div>
                <div class="card-body">
                    <div id="ticket-info" style="margin-bottom: 1rem; padding: 0.5rem; background: var(--light); border-radius: 4px; display: none;">
                        <small>Mesa: <span id="selected-mesa">-</span> | Comensales: <span id="comensales">-</span></small>
                    </div>
                    
                    <div class="ticket-items" id="ticket-items">
                        <div style="text-align: center; color: #666; padding: 2rem;">
                            Selecciona una mesa para comenzar
                        </div>
                    </div>
                    
                    <div class="ticket-total" id="ticket-total" style="display: none;">
                        <div>Total del Pedido</div>
                        <div class="total-amount" id="total-amount">€0.00</div>
                    </div>
                </div>
            </div>
            
            <!-- Acciones Rápidas -->
            <div class="card">
                <div class="card-header">⚡ Acciones</div>
                <div class="card-body">
                    <div class="quick-actions">
                        <button class="btn btn-success" onclick="crearVenta()" id="btn-crear-venta" disabled>
                            📋 Nueva Venta
                        </button>
                        <button class="btn btn-warning" onclick="enviarCocina()" id="btn-enviar-cocina" disabled>
                            🍳 A Cocina
                        </button>
                        <button class="btn btn-info" onclick="verCocina()">
                            👁️ Ver Cocina
                        </button>
                        <button class="btn btn-danger" onclick="cerrarVenta()" id="btn-cerrar-venta" disabled>
                            ✅ Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Variables globales
        let selectedMesa = null;
        let currentVenta = null;
        let ticketItems = [];
        let ticketTotal = 0;
        
        // Configuración del terminal
        const terminalName = window.location.hostname || 'Terminal-Garzón';
        document.getElementById('terminal-name').textContent = terminalName;
        
        // Cargar datos iniciales
        document.addEventListener('DOMContentLoaded', () => {
            loadMesas();
            loadProductos();
            
            // Actualizar cada 30 segundos
            setInterval(() => {
                if (currentVenta) {
                    updateTicketDisplay();
                }
            }, 30000);
        });
        
        // Cargar mesas disponibles
        async function loadMesas() {
            const mesas = [
                { Num_Mesa: 1, descripcion: 'Mesa 1', zona: 'Terraza', capacidad: 4, ocupada: false },
                { Num_Mesa: 2, descripcion: 'Mesa 2', zona: 'Terraza', capacidad: 4, ocupada: true },
                { Num_Mesa: 3, descripcion: 'Mesa 3', zona: 'Salón', capacidad: 2, ocupada: false },
                { Num_Mesa: 4, descripcion: 'Mesa 4', zona: 'Salón', capacidad: 6, ocupada: false },
                { Num_Mesa: 5, descripcion: 'Barra', zona: 'Barra', capacidad: 8, ocupada: false }
            ];
            
            const mesasGrid = document.getElementById('mesas-grid');
            mesasGrid.innerHTML = '';
            
            mesas.forEach(mesa => {
                const mesaCard = document.createElement('div');
                mesaCard.className = 'mesa-card' + (mesa.ocupada ? ' ocupada' : '');
                mesaCard.onclick = () => selectMesa(mesa.Num_Mesa, mesa);
                mesaCard.innerHTML = \`
                    <div class="mesa-numero">\${mesa.Num_Mesa}</div>
                    <div class="mesa-info">
                        \${mesa.zona}<br>
                        \${mesa.capacidad} pax
                    </div>
                \`;
                mesasGrid.appendChild(mesaCard);
            });
        }
        
        // Seleccionar mesa
        function selectMesa(numMesa, mesa) {
            selectedMesa = { ...mesa };
            
            // Actualizar UI
            document.querySelectorAll('.mesa-card').forEach(card => {
                card.classList.remove('selected');
            });
            event.target.closest('.mesa-card').classList.add('selected');
            
            // Habilitar botón crear venta
            document.getElementById('btn-crear-venta').disabled = false;
            
            // Mostrar info de mesa
            document.getElementById('selected-mesa').textContent = mesa.descripcion;
            document.getElementById('comensales').textContent = mesa.capacidad;
            document.getElementById('ticket-info').style.display = 'block';
            
            console.log('Mesa seleccionada:', selectedMesa);
        }
        
        // Cargar productos
        async function loadProductos() {
            const productos = [
                { id: 1, nombre: 'Ensalada César', precio: 12.50, cocina: true, categoria: 'Entrantes' },
                { id: 2, nombre: 'Paella Valenciana', precio: 28.00, cocina: true, categoria: 'Principales' },
                { id: 3, nombre: 'Solomillo', precio: 22.00, cocina: true, categoria: 'Principales' },
                { id: 4, nombre: 'Tarta Chocolate', precio: 7.50, cocina: false, categoria: 'Postres' },
                { id: 5, nombre: 'Cerveza', precio: 3.50, cocina: false, categoria: 'Bebidas' },
                { id: 6, nombre: 'Agua', precio: 2.50, cocina: false, categoria: 'Bebidas' },
                { id: 7, nombre: 'Café Solo', precio: 2.00, cocina: false, categoria: 'Cafés' },
                { id: 8, nombre: 'Cortado', precio: 2.20, cocina: false, categoria: 'Cafés' }
            ];
            
            const productosGrid = document.getElementById('productos-grid');
            productosGrid.innerHTML = '';
            
            productos.forEach(producto => {
                const productoCard = document.createElement('div');
                productoCard.className = 'producto-card';
                productoCard.onclick = () => agregarProducto(producto);
                productoCard.innerHTML = \`
                    <div class="producto-nombre">\${producto.nombre}</div>
                    <div class="producto-precio">€\${producto.precio.toFixed(2)}</div>
                    \${producto.cocina ? '<div class="cocina-badge">COCINA</div>' : ''}
                \`;
                productosGrid.appendChild(productoCard);
            });
        }
        
        // Crear nueva venta
        async function crearVenta() {
            if (!selectedMesa) {
                alert('Por favor selecciona una mesa');
                return;
            }
            
            try {
                const response = await fetch('/pos-api/nueva-venta', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Num_Mesa: selectedMesa.Num_Mesa,
                        comensales: selectedMesa.capacidad,
                        id_camarero: 1,
                        observaciones: \`Terminal: \${terminalName}\`
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    currentVenta = result.id_venta;
                    
                    // Actualizar UI
                    document.getElementById('btn-enviar-cocina').disabled = false;
                    document.getElementById('btn-cerrar-venta').disabled = false;
                    document.getElementById('btn-crear-venta').disabled = true;
                    
                    // Cambiar contenido del ticket
                    document.getElementById('ticket-items').innerHTML = '<div style="text-align: center; color: #666; padding: 1rem;">Agrega productos al pedido</div>';
                    document.getElementById('ticket-total').style.display = 'block';
                    
                    showNotification('Venta creada exitosamente', 'success');
                } else {
                    showNotification('Error creando venta: ' + result.error, 'error');
                }
            } catch (error) {
                showNotification('Error de conexión: ' + error.message, 'error');
            }
        }
        
        // Agregar producto
        async function agregarProducto(producto) {
            if (!currentVenta) {
                alert('Primero debes crear una venta');
                return;
            }
            
            try {
                const response = await fetch('/pos-api/agregar-producto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_venta: currentVenta,
                        id_complementog: producto.id,
                        cantidad: 1,
                        observaciones: '',
                        bloque_cocina: 1
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Agregar al ticket local
                    const existingItem = ticketItems.find(item => item.id === producto.id);
                    if (existingItem) {
                        existingItem.cantidad++;
                    } else {
                        ticketItems.push({
                            id: producto.id,
                            nombre: producto.nombre,
                            precio: producto.precio,
                            cantidad: 1,
                            cocina: producto.cocina
                        });
                    }
                    
                    updateTicketDisplay();
                    showNotification(\`\${producto.nombre} agregado\`, 'success');
                } else {
                    showNotification('Error agregando producto: ' + result.error, 'error');
                }
            } catch (error) {
                showNotification('Error de conexión: ' + error.message, 'error');
            }
        }
        
        // Actualizar display del ticket
        function updateTicketDisplay() {
            const ticketItemsContainer = document.getElementById('ticket-items');
            const totalAmountElement = document.getElementById('total-amount');
            
            if (ticketItems.length === 0) {
                ticketItemsContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 1rem;">Agrega productos al pedido</div>';
                totalAmountElement.textContent = '€0.00';
                return;
            }
            
            ticketItemsContainer.innerHTML = '';
            ticketTotal = 0;
            
            ticketItems.forEach(item => {
                const itemTotal = item.precio * item.cantidad;
                ticketTotal += itemTotal;
                
                const itemElement = document.createElement('div');
                itemElement.className = 'ticket-item';
                itemElement.innerHTML = \`
                    <div class="item-details">
                        <div class="item-name">\${item.nombre}</div>
                        <div class="item-qty">\${item.cantidad}x €\${item.precio.toFixed(2)} \${item.cocina ? '🍳' : ''}</div>
                    </div>
                    <div class="item-price">€\${itemTotal.toFixed(2)}</div>
                \`;
                ticketItemsContainer.appendChild(itemElement);
            });
            
            totalAmountElement.textContent = '€' + ticketTotal.toFixed(2);
        }
        
        // Enviar a cocina
        async function enviarCocina() {
            if (!currentVenta || ticketItems.length === 0) {
                alert('No hay productos para enviar');
                return;
            }
            
            try {
                const response = await fetch('/cocina/enviar-cocina', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_venta: currentVenta,
                        id_caja: 1
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showNotification(\`¡Pedido enviado a cocina! \${result.productos_enviados} productos\`, 'success');
                } else {
                    showNotification('Error enviando a cocina: ' + result.error, 'error');
                }
            } catch (error) {
                showNotification('Error de conexión: ' + error.message, 'error');
            }
        }
        
        // Ver panel de cocina
        function verCocina() {
            window.open('/cocina/panel', '_blank', 'width=1000,height=700');
        }
        
        // Cerrar venta
        async function cerrarVenta() {
            if (!currentVenta) {
                alert('No hay venta activa');
                return;
            }
            
            if (!confirm('¿Cerrar la venta actual?')) {
                return;
            }
            
            try {
                const response = await fetch('/pos-api/cerrar-venta', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_venta: currentVenta })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Reset
                    currentVenta = null;
                    selectedMesa = null;
                    ticketItems = [];
                    ticketTotal = 0;
                    
                    // Actualizar UI
                    document.getElementById('btn-crear-venta').disabled = true;
                    document.getElementById('btn-enviar-cocina').disabled = true;
                    document.getElementById('btn-cerrar-venta').disabled = true;
                    document.getElementById('ticket-info').style.display = 'none';
                    document.getElementById('ticket-total').style.display = 'none';
                    
                    // Limpiar selección
                    document.querySelectorAll('.mesa-card').forEach(card => {
                        card.classList.remove('selected');
                    });
                    
                    updateTicketDisplay();
                    showNotification(\`Venta cerrada. Total: €\${result.total}\`, 'success');
                    
                    // Recargar mesas
                    loadMesas();
                } else {
                    showNotification('Error cerrando venta: ' + result.error, 'error');
                }
            } catch (error) {
                showNotification('Error de conexión: ' + error.message, 'error');
            }
        }
        
        // Mostrar notificaciones
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                background: \${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--info)'};
                color: white;
                padding: 1rem;
                border-radius: 5px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 9999;
                max-width: 300px;
                font-weight: 500;
            \`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    </script>
</body>
</html>
    `);
});

export default router;