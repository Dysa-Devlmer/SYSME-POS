// web-interface/frontend/src/components/DocGenerator.jsx
// Generador de Documentación Automática

import React, { useState, useEffect } from 'react';

const DocGenerator = ({ socket }) => {
  const [generating, setGenerating] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedFile, setSelectedFile] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [projectDoc, setProjectDoc] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Escuchar documentación generada
    socket.on('docs:file-generated', (data) => {
      setGeneratedDocs(prev => [data, ...prev]);
      setSelectedDoc(data);
      setGenerating(false);
    });

    // Escuchar documentación de directorio
    socket.on('docs:directory-generated', (data) => {
      setGeneratedDocs(prev => [data, ...prev]);
      setSelectedDoc(data);
      setGenerating(false);
    });

    // Escuchar documentación de proyecto
    socket.on('docs:project-generated', (data) => {
      setProjectDoc(data);
      setGenerating(false);
    });

    // Escuchar lista de archivos para generar
    socket.on('docs:file-list', (data) => {
      setSearchResults(data.files);
    });

    return () => {
      socket.off('docs:file-generated');
      socket.off('docs:directory-generated');
      socket.off('docs:project-generated');
      socket.off('docs:file-list');
    };
  }, [socket]);

  const handleGenerateFileDoc = () => {
    if (!selectedFile || !socket) return;

    setGenerating(true);
    socket.emit('docs:generate-file', { filePath: selectedFile });
  };

  const handleGenerateProjectDoc = () => {
    if (!socket) return;

    setGenerating(true);
    socket.emit('docs:generate-project');
  };

  const handleSearch = (query) => {
    if (!socket || !query) return;
    socket.emit('docs:search-files', { query });
  };

  const formatComplexity = (complexity) => {
    const colors = {
      'Very Low': 'text-green-400',
      'Low': 'text-green-400',
      'Medium': 'text-yellow-400',
      'High': 'text-orange-400',
      'Very High': 'text-red-400'
    };
    return colors[complexity] || 'text-gray-400';
  };

  const downloadMarkdown = (markdown, fileName) => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>📚</span>
            <span>Generador de Documentación Automática</span>
          </h2>
          <button
            onClick={handleGenerateProjectDoc}
            disabled={generating}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              generating
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
            }`}
          >
            {generating ? '⏳ Generando...' : '📊 Documentación del Proyecto'}
          </button>
        </div>

        <p className="text-gray-400 text-sm">
          Genera documentación automática para archivos, directorios o el proyecto completo
        </p>
      </div>

      {/* Generador de archivo */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-4">📄 Generar Documentación de Archivo</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Buscar archivo o ruta:
            </label>
            <input
              type="text"
              placeholder="Ej: notification-system, core/autonomous, etc."
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto">
              <p className="text-sm text-gray-400 mb-2">Resultados ({searchResults.length}):</p>
              <div className="space-y-2">
                {searchResults.map((file, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedFile(file.path)}
                    className={`w-full text-left px-3 py-2 rounded transition-all ${
                      selectedFile === file.path
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate">{file.path}</span>
                      <span className="text-xs text-gray-400 ml-2">{file.lines} líneas</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedFile && (
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Archivo seleccionado:</p>
              <p className="text-white font-medium mb-3">{selectedFile}</p>
              <button
                onClick={handleGenerateFileDoc}
                disabled={generating}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  generating
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700'
                }`}
              >
                {generating ? '⏳ Generando...' : '📝 Generar Documentación'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Documentación generada */}
      {selectedDoc && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">📄 Documentación Generada</h3>
            <button
              onClick={() => downloadMarkdown(selectedDoc.markdown, `${selectedDoc.file.replace(/[\/\\]/g, '_')}.md`)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-semibold"
            >
              ⬇️ Descargar Markdown
            </button>
          </div>

          <div className="space-y-4">
            {/* Resumen */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">📋 Resumen</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Archivo:</span>
                  <span className="text-white ml-2 font-medium">{selectedDoc.file}</span>
                </div>
                <div>
                  <span className="text-gray-400">Descripción:</span>
                  <p className="text-white mt-1">{selectedDoc.summary?.description}</p>
                </div>
                <div className="flex space-x-6 mt-3">
                  <div>
                    <span className="text-gray-400">Propósito:</span>
                    <span className="text-cyan-400 ml-2">{selectedDoc.summary?.purpose}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Complejidad:</span>
                    <span className={`ml-2 font-semibold ${formatComplexity(selectedDoc.summary?.complexity)}`}>
                      {selectedDoc.summary?.complexity}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-6">
                  <div>
                    <span className="text-gray-400">Líneas:</span>
                    <span className="text-white ml-2">{selectedDoc.summary?.lines}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Tamaño:</span>
                    <span className="text-white ml-2">{(selectedDoc.summary?.size / 1024).toFixed(2)} KB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Funciones */}
            {selectedDoc.functions && selectedDoc.functions.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">⚡ Funciones ({selectedDoc.functions.length})</h4>
                <div className="space-y-2">
                  {selectedDoc.functions.map((fn, i) => (
                    <div key={i} className="bg-gray-600 rounded p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-cyan-400 font-mono text-sm">{fn.name}</span>
                        <span className={`text-xs ${formatComplexity(fn.complexity)}`}>
                          {fn.complexity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{fn.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clases */}
            {selectedDoc.classes && selectedDoc.classes.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">📦 Clases ({selectedDoc.classes.length})</h4>
                <div className="space-y-2">
                  {selectedDoc.classes.map((cls, i) => (
                    <div key={i} className="bg-gray-600 rounded p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-purple-400 font-mono text-sm">{cls.name}</span>
                        <span className={`text-xs ${formatComplexity(cls.complexity)}`}>
                          {cls.complexity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{cls.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exports e Imports */}
            <div className="grid grid-cols-2 gap-4">
              {selectedDoc.exports && selectedDoc.exports.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2 text-sm">📤 Exports</h4>
                  <div className="space-y-1">
                    {selectedDoc.exports.map((exp, i) => (
                      <div key={i} className="text-xs text-green-400 font-mono">• {exp}</div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDoc.imports && selectedDoc.imports.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2 text-sm">📥 Imports ({selectedDoc.imports.length})</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedDoc.imports.slice(0, 5).map((imp, i) => (
                      <div key={i} className="text-xs text-gray-400 font-mono truncate">• {imp}</div>
                    ))}
                    {selectedDoc.imports.length > 5 && (
                      <div className="text-xs text-gray-500 italic">... y {selectedDoc.imports.length - 5} más</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Preview del Markdown */}
            {selectedDoc.markdown && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">📝 Preview Markdown</h4>
                <pre className="text-xs text-gray-300 bg-gray-900 rounded p-4 overflow-x-auto max-h-96">
                  {selectedDoc.markdown}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documentación del proyecto */}
      {projectDoc && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">📊 Documentación del Proyecto</h3>
            <button
              onClick={() => downloadMarkdown(projectDoc.markdown, 'PROJECT-DOCUMENTATION.md')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-semibold"
            >
              ⬇️ Descargar
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Archivos</p>
              <p className="text-2xl font-bold text-white">{projectDoc.stats?.files}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Líneas</p>
              <p className="text-2xl font-bold text-cyan-400">{projectDoc.stats?.lines.toLocaleString()}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Funciones</p>
              <p className="text-2xl font-bold text-purple-400">{projectDoc.stats?.functions}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Clases</p>
              <p className="text-2xl font-bold text-pink-400">{projectDoc.stats?.classes}</p>
            </div>
          </div>

          {projectDoc.topFiles && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">📄 Archivos Principales (por tamaño)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-600">
                      <th className="pb-2">Archivo</th>
                      <th className="pb-2 text-right">Líneas</th>
                      <th className="pb-2 text-right">Funciones</th>
                      <th className="pb-2 text-right">Clases</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    {projectDoc.topFiles.map((file, i) => (
                      <tr key={i} className="border-b border-gray-700">
                        <td className="py-2 font-mono text-xs truncate max-w-md">{file.path}</td>
                        <td className="py-2 text-right text-white">{file.lines}</td>
                        <td className="py-2 text-right text-cyan-400">{file.functions}</td>
                        <td className="py-2 text-right text-purple-400">{file.classes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      {generatedDocs.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">📜 Historial de Documentación</h3>
          <div className="space-y-2">
            {generatedDocs.map((doc, index) => (
              <button
                key={index}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  selectedDoc === doc
                    ? 'bg-cyan-600 bg-opacity-20 border border-cyan-500'
                    : 'bg-gray-700 hover:bg-gray-650'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{doc.file}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(doc.generated).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-cyan-400">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Estado inicial */}
      {!selectedDoc && !projectDoc && generatedDocs.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-12 text-center shadow-lg">
          <p className="text-6xl mb-4">📚</p>
          <p className="text-xl text-white mb-2">Genera Documentación Automática</p>
          <p className="text-sm text-gray-400 mb-6">
            Crea documentación profesional para tus archivos o el proyecto completo
          </p>
          <div className="space-y-2 text-left max-w-md mx-auto text-sm text-gray-500">
            <p>💡 Funcionalidades:</p>
            <p className="ml-4">• Documentación de archivos individuales</p>
            <p className="ml-4">• Documentación de directorios</p>
            <p className="ml-4">• Resumen completo del proyecto</p>
            <p className="ml-4">• Exportación a Markdown</p>
            <p className="ml-4">• Análisis de complejidad</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocGenerator;
