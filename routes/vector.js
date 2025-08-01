import express from 'express';
import { searchVector } from '../services/searchService.js';
import { validateVectorSearch } from '../middleware/validation.js';

const router = express.Router();

/**
 * POST /api/search/vector
 * Búsqueda vectorial semántica
 */
router.post('/vector', validateVectorSearch, async (req, res) => {
  try {
    const { question, options = {} } = req.body;
    
    console.log(`🤖 Búsqueda vectorial: "${question}"`);
    
    const startTime = Date.now();
    const results = await searchVector(question, options);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Búsqueda vectorial completada en ${duration}ms - ${results.nbHits} resultados`);
    
    res.json({
      success: true,
      searchType: 'vector',
      question,
      results: {
        hits: results.hits,
        nbHits: results.nbHits,
        page: results.page || 0,
        nbPages: results.nbPages || 1,
        processingTimeMS: duration,
        embeddingGenerated: true
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en búsqueda vectorial:', error);
    
    res.status(500).json({
      success: false,
      searchType: 'vector',
      error: {
        message: 'Error al realizar la búsqueda vectorial',
        details: error.message,
        type: 'VectorSearchError'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;