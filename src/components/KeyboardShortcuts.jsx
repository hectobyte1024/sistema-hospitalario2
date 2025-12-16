import React, { useEffect } from 'react';

/**
 * Hook para gestionar atajos de teclado globales
 * Mejora la accesibilidad y eficiencia del sistema
 */
export function useKeyboardShortcuts(shortcuts = {}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      // Crear identificador del atajo
      let shortcutKey = '';
      if (ctrl) shortcutKey += 'ctrl+';
      if (shift) shortcutKey += 'shift+';
      if (alt) shortcutKey += 'alt+';
      shortcutKey += key;

      // Ejecutar la acción si existe
      const action = shortcuts[shortcutKey];
      if (action) {
        event.preventDefault();
        action(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Componente de ayuda de atajos de teclado
 */
export default function KeyboardShortcuts({ isOpen, onClose, shortcuts = [] }) {
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultShortcuts = [
    { category: 'General', items: [
      { keys: ['Ctrl', 'N'], description: 'Nuevo registro' },
      { keys: ['Ctrl', 'S'], description: 'Guardar cambios' },
      { keys: ['Ctrl', 'F'], description: 'Buscar paciente' },
      { keys: ['Esc'], description: 'Cerrar ventanas' },
      { keys: ['F1'], description: 'Ayuda' }
    ]},
    { category: 'Navegación', items: [
      { keys: ['Alt', '1'], description: 'Panel principal' },
      { keys: ['Alt', '2'], description: 'Pacientes' },
      { keys: ['Alt', '3'], description: 'Signos vitales' },
      { keys: ['Tab'], description: 'Siguiente campo' },
      { keys: ['Shift', 'Tab'], description: 'Campo anterior' }
    ]},
    { category: 'Acciones', items: [
      { keys: ['Enter'], description: 'Confirmar acción' },
      { keys: ['Ctrl', 'Enter'], description: 'Guardar y nuevo' },
      { keys: ['Ctrl', 'Z'], description: 'Deshacer' },
      { keys: ['Ctrl', 'P'], description: 'Imprimir' }
    ]}
  ];

  const displayShortcuts = shortcuts.length > 0 ? shortcuts : defaultShortcuts;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl mx-4 animate-scaleIn">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="text-3xl">⌨️</span>
                Atajos de Teclado
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Cerrar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-white/90 mt-2">
              Usa estos atajos para trabajar más rápido sin usar el mouse
            </p>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {displayShortcuts.map((category, catIndex) => (
                <div key={catIndex}>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                    {category.category}
                  </h3>
                  <div className="space-y-2">
                    {category.items.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <span className="text-gray-700">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <React.Fragment key={keyIndex}>
                              {keyIndex > 0 && (
                                <span className="text-gray-400 mx-1">+</span>
                              )}
                              <kbd className="px-3 py-1.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-mono font-semibold text-gray-800 shadow-sm">
                                {key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer tip */}
            <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Consejo:</strong> Presiona <kbd className="px-2 py-1 bg-white border border-blue-300 rounded text-xs font-mono mx-1">F1</kbd> en cualquier momento para ver ayuda contextual
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
