import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import keywordRoutes from './routes/keyword.js';
import vectorRoutes from './routes/vector.js';
import config from './config/algolia.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    algolia: {
      configured: config.isConfigured,
      indexName: config.indexName
    }
  });
});

// API Routes
app.use('/api/search', keywordRoutes);
app.use('/api/search', vectorRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Error en el servidor:', error);
  
  res.status(error.status || 500).json({
    error: {
      message: error.message || 'Error interno del servidor',
      type: error.type || 'ServerError',
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
      type: 'NotFound',
      timestamp: new Date().toISOString()
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Farmatodo PoC ejecutándose en puerto ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api/search`);
  
  if (config.validation.missingKeys.length > 0) {
    console.log('⚠️  Ejecutando en modo MOCK (desarrollo) por falta de variables de entorno:');
    console.log(`   Keys faltantes: ${config.validation.missingKeys.join(', ')}`);
  } else {
    console.log('✅ Conectado a Algolia y OpenAI en producción');
  }
});

export default app;