const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Configuración de almacenamiento
const store = new Store();

// Variable para ventana principal
let mainWindow;

// Estado de desarrollo
const isDev = process.env.ELECTRON_IS_DEV === 'true';

function createWindow() {
    // Crear la ventana principal
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false // Necesario para conectar a localhost
        },
        titleBarStyle: 'default',
        show: false // No mostrar hasta que esté listo
    });

    // Cargar la aplicación
    if (isDev) {
        // En desarrollo, cargar desde servidor local
        mainWindow.loadURL('http://localhost:3001');
        mainWindow.webContents.openDevTools();
    } else {
        // En producción, cargar archivo local
        mainWindow.loadFile('waiter-interface.html');
    }

    // Mostrar ventana cuando esté lista
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Maximizar en primera ejecución
        if (!store.get('window.wasMaximized')) {
            mainWindow.maximize();
            store.set('window.wasMaximized', true);
        }
    });

    // Manejar cierre de ventana
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Interceptar enlaces externos
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// Crear menú de aplicación
function createMenu() {
    const template = [
        {
            label: 'SYSME TPV',
            submenu: [
                {
                    label: 'Acerca de SYSME TPV 2.0',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Acerca de SYSME TPV 2.0',
                            message: 'SYSME TPV 2.0',
                            detail: 'Sistema Profesional de Punto de Venta para Restaurantes\n\nVersión: 2.0.0\nDesarrollado con tecnología moderna\nCompatible con sistema original',
                            buttons: ['OK']
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Configuración',
                    accelerator: 'CmdOrCtrl+ சிற',
                    click: () => {
                        // Enviar evento a la aplicación web
                        mainWindow.webContents.send('menu-action', 'settings');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Salir',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Archivo',
            submenu: [
                {
                    label: 'Nueva Venta',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'new-sale');
                    }
                },
                {
                    label: 'Cerrar Venta',
                    accelerator: 'CmdOrCtrl+W',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'close-sale');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Imprimir Ticket',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'print-ticket');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Backup Base de Datos',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'backup-db');
                    }
                }
            ]
        },
        {
            label: 'TPV',
            submenu: [
                {
                    label: 'Terminal de Ventas',
                    accelerator: 'F1',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'sales-terminal');
                    }
                },
                {
                    label: 'Panel de Cocina',
                    accelerator: 'F2',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'kitchen-panel');
                    }
                },
                {
                    label: 'Gestión de Mesas',
                    accelerator: 'F3',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'tables-management');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Movimientos de Caja',
                    accelerator: 'F4',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'cash-movements');
                    }
                },
                {
                    label: 'Cierre de Caja',
                    accelerator: 'F5',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'cash-close');
                    }
                }
            ]
        },
        {
            label: 'Catálogo',
            submenu: [
                {
                    label: 'Productos',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'products');
                    }
                },
                {
                    label: 'Categorías',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'categories');
                    }
                },
                {
                    label: 'Tarifas Especiales',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'special-prices');
                    }
                },
                {
                    label: 'Promociones',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'promotions');
                    }
                }
            ]
        },
        {
            label: 'Stock',
            submenu: [
                {
                    label: 'Almacenes',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'warehouses');
                    }
                },
                {
                    label: 'Entrada de Productos',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'product-entry');
                    }
                },
                {
                    label: 'Inventario',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'inventory');
                    }
                },
                {
                    label: 'Proveedores',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'suppliers');
                    }
                }
            ]
        },
        {
            label: 'Hostelería',
            submenu: [
                {
                    label: 'Mesas',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'tables');
                    }
                },
                {
                    label: 'Salones',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'rooms');
                    }
                },
                {
                    label: 'Reservas',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'reservations');
                    }
                },
                {
                    label: 'Panel Cocina',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'kitchen-display');
                    }
                }
            ]
        },
        {
            label: 'Informes',
            submenu: [
                {
                    label: 'Informe de Caja',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'cash-report');
                    }
                },
                {
                    label: 'Ventas del Día',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'daily-sales');
                    }
                },
                {
                    label: 'Productos Más Vendidos',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'top-products');
                    }
                },
                {
                    label: 'Estadísticas de Cocina',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'kitchen-stats');
                    }
                }
            ]
        },
        {
            label: 'Sistema',
            submenu: [
                {
                    label: 'Configuración',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'system-config');
                    }
                },
                {
                    label: 'Empleados',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'employees');
                    }
                },
                {
                    label: 'Puntos de Venta',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'pos-terminals');
                    }
                },
                {
                    label: 'Formas de Pago',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'payment-methods');
                    }
                }
            ]
        },
        {
            label: 'Ventana',
            submenu: [
                {
                    label: 'Minimizar',
                    accelerator: 'CmdOrCtrl+M',
                    role: 'minimize'
                },
                {
                    label: 'Cerrar',
                    accelerator: 'CmdOrCtrl+W',
                    role: 'close'
                },
                { type: 'separator' },
                {
                    label: 'Recargar',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Pantalla Completa',
                    accelerator: 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                }
            ]
        },
        {
            label: 'Ayuda',
            submenu: [
                {
                    label: 'Manual de Usuario',
                    click: () => {
                        shell.openExternal('https://docs.sysme.net');
                    }
                },
                {
                    label: 'Soporte Técnico',
                    click: () => {
                        shell.openExternal('https://soporte.sysme.net');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Herramientas de Desarrollador',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Eventos de aplicación
app.whenReady().then(() => {
    createWindow();
    createMenu();

    // Manejadores IPC
    ipcMain.handle('app-version', () => {
        return app.getVersion();
    });

    ipcMain.handle('show-message-box', async (event, options) => {
        const result = await dialog.showMessageBox(mainWindow, options);
        return result;
    });

    ipcMain.handle('show-save-dialog', async (event, options) => {
        const result = await dialog.showSaveDialog(mainWindow, options);
        return result;
    });

    ipcMain.handle('show-open-dialog', async (event, options) => {
        const result = await dialog.showOpenDialog(mainWindow, options);
        return result;
    });
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Evitar múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}
