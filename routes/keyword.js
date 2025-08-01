import express from 'express';
import { searchKeyword } from '../services/searchService.js';
import { validateKeywordSearch } from '../middleware/validation.js';

const router = express.Router();

/**
 * POST /api/search/keyword
 * Búsqueda tradicional por palabras clave
 */
router.post('/keyword', validateKeywordSearch, async (req, res) => {
  try {
    const { query, filters = {}, options = {} } = req.body;
    
    console.log(`🔍 Búsqueda keyword: "${query}"`);
    console.log(`📋 Filtros:`, filters);
    
    const startTime = Date.now();
    const results = await searchKeyword(query, filters, options);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Búsqueda completada en ${duration}ms - ${results.nbHits} resultados`);
    
    res.json({
      success: true,
      searchType: 'keyword',
      query,
      results: {
        hits: results.hits,
        nbHits: results.nbHits,
        page: results.page || 0,
        nbPages: results.nbPages || 1,
        processingTimeMS: duration
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en búsqueda keyword:', error);
    
    res.status(500).json({
      success: false,
      searchType: 'keyword',
      error: {
        message: 'Error al realizar la búsqueda por palabras clave',
        details: error.message,
        type: 'KeywordSearchError'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;