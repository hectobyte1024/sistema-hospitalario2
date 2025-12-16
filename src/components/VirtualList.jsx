import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Componente de lista virtualizada para renderizar eficientemente miles de elementos
 * Solo renderiza los elementos visibles en el viewport + un buffer
 */
export default function VirtualList({
  items = [],
  height = 600,
  itemHeight = 80,
  renderItem,
  overscan = 3,
  className = '',
  emptyMessage = 'No hay elementos para mostrar'
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Calcular índices visibles
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscan
  );

  // Elementos visibles
  const visibleItems = items.slice(startIndex, endIndex + 1);

  // Altura total del contenedor
  const totalHeight = items.length * itemHeight;

  // Offset para posicionar correctamente los elementos visibles
  const offsetY = startIndex * itemHeight;

  if (items.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center text-gray-500 ${className}`}
        style={{ height }}
      >
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Componente optimizado para tablas grandes
 */
export function VirtualTable({
  data = [],
  columns = [],
  height = 600,
  rowHeight = 60,
  className = ''
}) {
  const renderRow = useCallback((row, index) => (
    <div className="flex border-b border-gray-200 hover:bg-gray-50 transition-colors">
      {columns.map((col, colIndex) => (
        <div
          key={colIndex}
          className="flex items-center px-4 py-3"
          style={{ width: col.width || 'auto', flex: col.flex || 'none' }}
        >
          {col.render ? col.render(row[col.key], row, index) : row[col.key]}
        </div>
      ))}
    </div>
  ), [columns]);

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-gray-200 font-semibold">
        {columns.map((col, index) => (
          <div
            key={index}
            className="px-4 py-3 text-gray-700 text-sm"
            style={{ width: col.width || 'auto', flex: col.flex || 'none' }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Virtual Body */}
      <VirtualList
        items={data}
        height={height}
        itemHeight={rowHeight}
        renderItem={renderRow}
      />
    </div>
  );
}

/**
 * Componente de scroll infinito para cargar datos bajo demanda
 */
export function InfiniteScroll({
  items = [],
  loadMore,
  hasMore = false,
  loading = false,
  renderItem,
  threshold = 200,
  loader = null,
  endMessage = null,
  className = ''
}) {
  const observerTarget = useRef(null);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0, rootMargin: `${threshold}px` }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadMore, threshold]);

  return (
    <div className={className}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}

      {loading && (
        loader || (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-gray-600">Cargando más...</span>
          </div>
        )
      )}

      {!loading && hasMore && (
        <div ref={observerTarget} style={{ height: '20px' }} />
      )}

      {!loading && !hasMore && endMessage && (
        <div className="text-center py-4 text-gray-500 text-sm">
          {endMessage}
        </div>
      )}
    </div>
  );
}

/**
 * Paginador visual optimizado
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisible = 5,
  className = ''
}) {
  const getPageNumbers = () => {
    const pages = [];
    const halfVisible = Math.floor(maxVisible / 2);
    
    let start = Math.max(1, currentPage - halfVisible);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  const pages = getPageNumbers();

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {/* Botón Primera Página */}
      {currentPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            aria-label="Primera página"
          >
            ««
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            aria-label="Página anterior"
          >
            «
          </button>
        </>
      )}

      {/* Números de página */}
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            page === currentPage
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          aria-label={`Página ${page}`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      {/* Botón Última Página */}
      {currentPage < totalPages && (
        <>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            aria-label="Página siguiente"
          >
            »
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            aria-label="Última página"
          >
            »»
          </button>
        </>
      )}

      {/* Información de página */}
      <span className="ml-4 text-sm text-gray-600">
        Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
      </span>
    </div>
  );
}

/**
 * Loader de esqueleto para mejorar la percepción de carga
 */
export function SkeletonLoader({ type = 'card', count = 1 }) {
  const skeletons = {
    card: (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    ),
    list: (
      <div className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ),
    table: (
      <div className="bg-white rounded-lg border border-gray-200 animate-pulse">
        <div className="p-4 border-b border-gray-200 flex gap-4">
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-200 flex gap-4">
            <div className="h-3 bg-gray-200 rounded flex-1"></div>
            <div className="h-3 bg-gray-200 rounded flex-1"></div>
            <div className="h-3 bg-gray-200 rounded flex-1"></div>
          </div>
        ))}
      </div>
    )
  };

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>
          {skeletons[type]}
        </React.Fragment>
      ))}
    </div>
  );
}
