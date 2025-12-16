import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Componente Tooltip reutilizable para mostrar ayuda contextual
 * Mejora la usabilidad del sistema proporcionando información adicional
 */
export default function Tooltip({ text, children, position = 'top', type = 'default' }) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const typeStyles = {
    default: 'bg-gray-900 text-white',
    info: 'bg-blue-600 text-white',
    success: 'bg-green-600 text-white',
    warning: 'bg-yellow-600 text-white',
    error: 'bg-red-600 text-white'
  };

  return (
    <div className="relative inline-flex items-center group">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="inline-flex items-center"
      >
        {children}
      </div>
      
      {isVisible && (
        <div 
          className={`absolute z-50 px-3 py-2 text-sm font-medium rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-fadeIn ${positionClasses[position]} ${typeStyles[type]}`}
          role="tooltip"
        >
          {text}
          {/* Arrow */}
          <div 
            className={`absolute w-2 h-2 ${typeStyles[type]} transform rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
              'right-full top-1/2 -translate-y-1/2 -mr-1'
            }`}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Icono de ayuda con tooltip
 */
export function HelpTooltip({ text, position = 'top' }) {
  return (
    <Tooltip text={text} position={position} type="info">
      <button
        type="button"
        className="inline-flex items-center justify-center w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        aria-label="Ayuda"
      >
        <HelpCircle size={18} />
      </button>
    </Tooltip>
  );
}
