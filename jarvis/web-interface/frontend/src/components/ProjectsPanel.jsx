// web-interface/frontend/src/components/ProjectsPanel.jsx
// Panel de visualización de proyectos

import React from 'react';

export default function ProjectsPanel({ projects }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">📁 Proyectos</h2>
        <div className="text-sm text-gray-400">
          Total: {projects.length} proyectos
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.length === 0 ? (
          <div className="col-span-full bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-2">📁</div>
            <p className="text-gray-400">No se encontraron proyectos</p>
            <p className="text-gray-500 text-sm mt-2">
              Los proyectos aparecerán aquí cuando se creen en la carpeta /projects
            </p>
          </div>
        ) : (
          projects.map((project, index) => (
            <div
              key={index}
              className="bg-gray-800 rounded-lg p-5 hover:bg-gray-750 transition-colors shadow-lg hover:shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">📂</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{project.name}</h3>
                  <p className="text-xs text-gray-500 mb-3 break-all">
                    {project.path}
                  </p>
                  {project.created && (
                    <div className="text-xs text-gray-400">
                      📅 Creado: {new Date(project.created).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors">
                  Abrir
                </button>
                <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                  ⚙️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4">
        <h3 className="font-semibold mb-2">💡 Información</h3>
        <p className="text-sm text-gray-300">
          Los proyectos se detectan automáticamente desde el directorio <code className="bg-gray-800 px-2 py-1 rounded">projects/</code>.
          Cualquier carpeta en ese directorio aparecerá listada aquí.
        </p>
      </div>
    </div>
  );
}
