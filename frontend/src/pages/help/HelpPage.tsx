/**
 * Help & Documentation Page
 * SYSME 2.0 - Restaurant POS System
 */
import React, { useState } from 'react';

const HelpPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'quick-guide' | 'shortcuts' | 'faq' | 'support' | 'videos'>('quick-guide');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Quick Guide Sections
  const quickGuide = [
    {
      title: '🏠 Dashboard Principal',
      description: 'Vista general de ventas, mesas activas y métricas del día.',
      steps: [
        'Accede desde el menú lateral o la página de inicio',
        'Visualiza KPIs en tiempo real',
        'Revisa alertas y notificaciones importantes'
      ]
    },
    {
      title: '💳 Sistema POS',
      description: 'Gestión de ventas y cobros en punto de venta.',
      steps: [
        'Selecciona productos del catálogo',
        'Aplica modificadores y descuentos',
        'Procesa pagos (efectivo, tarjeta, QR)',
        'Imprime tickets automáticamente'
      ]
    },
    {
      title: '🍽️ Gestión de Mesas',
      description: 'Control de mesas, reservas y tiempos de espera.',
      steps: [
        'Visualiza el mapa de mesas en tiempo real',
        'Asigna clientes a mesas disponibles',
        'Transfiere pedidos entre mesas',
        'Cierra mesas y genera cuenta'
      ]
    },
    {
      title: '👨‍🍳 Módulo de Cocina',
      description: 'Sistema de órdenes para el equipo de cocina.',
      steps: [
        'Recibe órdenes en tiempo real',
        'Marca items como "En preparación"',
        'Notifica cuando estén listos',
        'Mantén tiempos de preparación óptimos'
      ]
    },
    {
      title: '📊 Analíticas e Informes',
      description: 'Reportes detallados de ventas y operaciones.',
      steps: [
        'Selecciona período de análisis',
        'Visualiza gráficas y tendencias',
        'Exporta reportes en PDF/Excel',
        'Compara períodos anteriores'
      ]
    },
    {
      title: '💎 Programa Loyalty',
      description: 'Gestión de clientes frecuentes y recompensas.',
      steps: [
        'Registra nuevos miembros',
        'Acumula puntos por compras',
        'Canjea recompensas',
        'Gestiona niveles (Bronce, Plata, Oro, Platino)'
      ]
    }
  ];

  // Keyboard Shortcuts
  const shortcuts = [
    { section: 'General', keys: [
      { combo: 'Ctrl + K', description: 'Búsqueda rápida' },
      { combo: 'Ctrl + B', description: 'Alternar sidebar' },
      { combo: 'Esc', description: 'Cerrar modales' },
      { combo: 'F5', description: 'Recargar datos' }
    ]},
    { section: 'POS / Ventas', keys: [
      { combo: 'F1', description: 'Nueva venta' },
      { combo: 'F2', description: 'Buscar producto' },
      { combo: 'F3', description: 'Aplicar descuento' },
      { combo: 'F4', description: 'Cobrar venta' },
      { combo: 'Ctrl + P', description: 'Aparcar venta' },
      { combo: 'Ctrl + Enter', description: 'Confirmar pago' }
    ]},
    { section: 'Mesas', keys: [
      { combo: 'M', description: 'Ver mapa de mesas' },
      { combo: 'N', description: 'Nueva mesa' },
      { combo: 'T', description: 'Transferir pedido' },
      { combo: 'C', description: 'Cerrar mesa' }
    ]},
    { section: 'Cocina', keys: [
      { combo: 'Space', description: 'Marcar listo' },
      { combo: 'R', description: 'Refrescar órdenes' },
      { combo: '1-9', description: 'Seleccionar orden' }
    ]},
    { section: 'Navegación', keys: [
      { combo: 'Ctrl + H', description: 'Ir a Dashboard' },
      { combo: 'Ctrl + Shift + P', description: 'Ir a POS' },
      { combo: 'Ctrl + Shift + M', description: 'Ir a Mesas' },
      { combo: 'Ctrl + Shift + K', description: 'Ir a Cocina' }
    ]}
  ];

  // FAQ
  const faqs = [
    {
      question: '¿Cómo inicio sesión en el sistema?',
      answer: 'Usa tus credenciales proporcionadas por tu administrador. Si olvidaste tu contraseña, contacta al administrador del sistema para restablecerla.'
    },
    {
      question: '¿Qué hago si no puedo procesar un pago?',
      answer: 'Verifica la conexión a internet y que el terminal de pago esté encendido. Si el problema persiste, puedes aparcar la venta (Ctrl+P) y procesar otros clientes mientras se soluciona.'
    },
    {
      question: '¿Cómo cancelo una orden en cocina?',
      answer: 'Solo usuarios con rol Manager o superior pueden cancelar órdenes. Selecciona la orden y haz clic en "Cancelar". Se notificará automáticamente al personal correspondiente.'
    },
    {
      question: '¿Puedo transferir un pedido entre mesas?',
      answer: 'Sí, desde el módulo de Mesas selecciona la mesa origen, haz clic en "Transferir" y elige la mesa destino. Los items se moverán automáticamente.'
    },
    {
      question: '¿Cómo aplico un descuento?',
      answer: 'En el POS, después de agregar productos, haz clic en "Descuento" (o presiona F3). Puedes aplicar descuentos por porcentaje o monto fijo. Se requieren permisos según el monto.'
    },
    {
      question: '¿Cómo cierro mi caja al final del turno?',
      answer: 'Ve al módulo de Caja, revisa el resumen de movimientos, verifica el efectivo físico contra el sistema, y haz clic en "Cerrar Caja". El sistema generará un reporte automático.'
    },
    {
      question: '¿Qué significa cada estado de orden en cocina?',
      answer: 'Pendiente (gris): recién recibida. En preparación (amarillo): cocinero trabajando. Listo (verde): orden completada. Entregado (azul): ya servido al cliente.'
    },
    {
      question: '¿Cómo registro un nuevo cliente en Loyalty?',
      answer: 'Desde el módulo Programa Loyalty, pestaña "Miembros", haz clic en "Nuevo Miembro". Ingresa los datos básicos y se generará automáticamente un número de membresía.'
    },
    {
      question: '¿Puedo usar el sistema sin conexión a internet?',
      answer: 'El sistema funciona en modo local sin internet. Sin embargo, algunas funciones como sincronización con otras sucursales, pagos con QR y notificaciones requieren conexión.'
    },
    {
      question: '¿Cómo exporto reportes?',
      answer: 'En el módulo de Reportes o Analíticas, selecciona el período deseado, configura los filtros y haz clic en "Exportar". Puedes elegir formato PDF, Excel o CSV.'
    },
    {
      question: '¿Qué hago si el sistema está lento?',
      answer: 'Verifica que no haya múltiples pestañas abiertas. Cierra sesión y vuelve a iniciar. Si el problema persiste, contacta a soporte técnico para revisar el servidor.'
    },
    {
      question: '¿Cómo modifico el inventario de productos?',
      answer: 'Solo usuarios con rol Manager+ pueden modificar inventario. Ve a Productos o Inventario, selecciona el item y ajusta las cantidades. Los cambios se reflejan en tiempo real.'
    }
  ];

  // Support Contact
  const supportChannels = [
    {
      icon: '📧',
      title: 'Email',
      value: 'soporte@sysme.com',
      description: 'Respuesta en 24 horas hábiles'
    },
    {
      icon: '📱',
      title: 'WhatsApp',
      value: '+56 9 1234 5678',
      description: 'Atención de Lunes a Viernes, 9:00 - 18:00'
    },
    {
      icon: '☎️',
      title: 'Teléfono',
      value: '+56 2 2345 6789',
      description: 'Soporte técnico en horario laboral'
    },
    {
      icon: '💬',
      title: 'Chat en Vivo',
      value: 'Disponible en horario laboral',
      description: 'Respuesta inmediata de 9:00 a 18:00'
    }
  ];

  // Video Tutorials (placeholder)
  const videoTutorials = [
    {
      title: 'Introducción a SYSME 2.0',
      duration: '5:30',
      description: 'Tour completo del sistema y sus módulos principales',
      thumbnail: '🎬',
      url: '#'
    },
    {
      title: 'Cómo procesar una venta en POS',
      duration: '8:15',
      description: 'Paso a paso para realizar ventas, aplicar descuentos y cobrar',
      thumbnail: '💳',
      url: '#'
    },
    {
      title: 'Gestión eficiente de mesas',
      duration: '6:45',
      description: 'Asignación, transferencias y cierre de mesas',
      thumbnail: '🍽️',
      url: '#'
    },
    {
      title: 'Módulo de cocina: flujo óptimo',
      duration: '7:20',
      description: 'Optimiza tiempos de preparación y comunicación',
      thumbnail: '👨‍🍳',
      url: '#'
    },
    {
      title: 'Reportes y análisis de ventas',
      duration: '10:00',
      description: 'Genera reportes detallados y toma decisiones basadas en datos',
      thumbnail: '📊',
      url: '#'
    },
    {
      title: 'Programa Loyalty: configuración',
      duration: '9:30',
      description: 'Configura niveles, recompensas y gestiona miembros',
      thumbnail: '💎',
      url: '#'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Centro de Ayuda</h1>
          <p className="text-gray-600">Documentación completa del sistema SYSME 2.0</p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <nav className="flex space-x-1 p-2 border-b border-gray-200">
            <button
              onClick={() => setActiveSection('quick-guide')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeSection === 'quick-guide'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📖 Guía Rápida
            </button>
            <button
              onClick={() => setActiveSection('shortcuts')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeSection === 'shortcuts'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ⌨️ Atajos
            </button>
            <button
              onClick={() => setActiveSection('faq')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeSection === 'faq'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ❓ FAQ
            </button>
            <button
              onClick={() => setActiveSection('videos')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeSection === 'videos'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🎥 Videos
            </button>
            <button
              onClick={() => setActiveSection('support')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeSection === 'support'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📞 Soporte
            </button>
          </nav>
        </div>

        {/* Content Sections */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Quick Guide Section */}
          {activeSection === 'quick-guide' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Guía Rápida del Sistema</h2>
              <div className="space-y-6">
                {quickGuide.map((section, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 transition-colors">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{section.title}</h3>
                    <p className="text-gray-600 mb-4">{section.description}</p>
                    <div className="bg-gray-50 rounded-md p-4">
                      <p className="font-medium text-gray-700 mb-2">Pasos:</p>
                      <ul className="list-decimal list-inside space-y-1 text-gray-600">
                        {section.steps.map((step, stepIndex) => (
                          <li key={stepIndex}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Section */}
          {activeSection === 'shortcuts' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Atajos de Teclado</h2>
              <div className="space-y-6">
                {shortcuts.map((section, index) => (
                  <div key={index}>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      {section.section}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {section.keys.map((shortcut, keyIndex) => (
                        <div key={keyIndex} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <span className="text-gray-600">{shortcut.description}</span>
                          <kbd className="px-3 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono text-sm text-gray-800">
                            {shortcut.combo}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  💡 <strong>Consejo:</strong> Los atajos de teclado pueden aumentar tu productividad hasta un 50%. Practica los más utilizados durante tu turno.
                </p>
              </div>
            </div>
          )}

          {/* FAQ Section */}
          {activeSection === 'faq' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas Frecuentes</h2>
              <div className="space-y-3">
                {faqs.map((faq, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900 text-left">{faq.question}</span>
                      <span className="text-gray-500 ml-4">
                        {expandedFaq === index ? '▲' : '▼'}
                      </span>
                    </button>
                    {expandedFaq === index && (
                      <div className="px-4 pb-4 text-gray-600 bg-gray-50 border-t border-gray-200">
                        <p className="pt-3">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  ❓ ¿No encuentras tu respuesta? Contacta a nuestro equipo de soporte en la pestaña "Soporte".
                </p>
              </div>
            </div>
          )}

          {/* Video Tutorials Section */}
          {activeSection === 'videos' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Video Tutoriales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videoTutorials.map((video, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 h-40 flex items-center justify-center text-6xl">
                      {video.thumbnail}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">{video.title}</h3>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">{video.duration}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{video.description}</p>
                      <button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors">
                        ▶ Ver Tutorial
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-purple-800 text-sm">
                  🎬 <strong>Próximamente:</strong> Más tutoriales sobre módulos avanzados como Business Intelligence, Multi-Sucursal y más.
                </p>
              </div>
            </div>
          )}

          {/* Support Section */}
          {activeSection === 'support' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contacto de Soporte</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {supportChannels.map((channel, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                    <div className="text-4xl mb-3">{channel.icon}</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{channel.title}</h3>
                    <p className="text-blue-600 font-medium mb-2">{channel.value}</p>
                    <p className="text-sm text-gray-600">{channel.description}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Información del Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Versión del Sistema:</p>
                    <p className="font-mono font-bold text-gray-900">SYSME 2.0.0</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Última Actualización:</p>
                    <p className="font-mono font-bold text-gray-900">Diciembre 2024</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Servidor:</p>
                    <p className="font-mono font-bold text-gray-900">{import.meta.env.VITE_API_URL || 'localhost:3000'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Estado:</p>
                    <p className="flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      <span className="font-bold text-green-700">Operativo</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">
                  🚨 <strong>Para emergencias críticas:</strong> Si el sistema está completamente inoperativo y afecta las operaciones del restaurante, llama al +56 9 9999 9999 (línea de emergencia 24/7).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
