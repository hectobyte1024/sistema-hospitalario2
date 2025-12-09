import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initializeApp } from './hooks/useDatabase'
import { createDatabaseIndexes, initPreparedQueries } from './utils/databaseOptimizations'

console.log('🚀 Application starting - main.jsx loaded');

// Render app immediately to avoid white screen
console.log('📱 Rendering React root...');
const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h2>⏳ Inicializando sistema hospitalario...</h2>
      <p>Configurando base de datos, por favor espere...</p>
      <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
        🚀 Optimizando rendimiento...
      </p>
    </div>
  </StrictMode>
);

// Initialize database and optimizations in background
console.log('🚀 Starting database initialization...');
Promise.all([
  initializeApp(),
  createDatabaseIndexes().catch(err => console.warn('Índices ya existen o error:', err)),
  initPreparedQueries().catch(err => console.warn('Error preparando queries:', err))
])
  .then(() => {
    console.log('✅ Database initialized successfully');
    console.log('✅ Performance optimizations applied');
    console.log('✅ Rendering full application...');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err);
    console.error('❌ Error details:', err.message);
    console.error('❌ Error stack:', err.stack);
    
    // Show error but render app anyway
    root.render(
      <StrictMode>
        <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
          <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <h2 style={{ color: '#dc2626', margin: '0 0 12px 0', fontSize: '24px' }}>⚠️ Error al iniciar la base de datos</h2>
            <p style={{ color: '#991b1b', margin: '0 0 12px 0', fontSize: '16px' }}>{err.message || 'Error desconocido'}</p>
            <details style={{ color: '#7f1d1d', fontSize: '14px' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px', fontWeight: 'bold' }}>Ver detalles técnicos</summary>
              <pre style={{ background: '#fff', padding: '12px', borderRadius: '6px', overflow: 'auto', fontSize: '12px' }}>
{err.stack || JSON.stringify(err, null, 2)}
              </pre>
            </details>
          </div>
          <App />
        </div>
      </StrictMode>,
    )
  });
