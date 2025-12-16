import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Componente Breadcrumbs para navegación contextual
 * Ayuda a los usuarios a entender dónde están en el sistema
 */
export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="mx-2 text-gray-400" size={16} />
            )}
            {index === 0 && item.icon !== false && (
              <Home className="mr-2 text-gray-500" size={16} />
            )}
            {item.onClick ? (
              <button
                onClick={item.onClick}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
              >
                {item.label}
              </button>
            ) : (
              <span
                className={`${
                  index === items.length - 1
                    ? 'text-gray-800 font-semibold'
                    : 'text-gray-600'
                }`}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
