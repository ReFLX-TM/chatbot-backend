/**
 * Middleware de validación para búsqueda por palabras clave
 */
function validateKeywordSearch(req, res, next) {
  const { query, filters, options } = req.body;
  
  // Validar query requerido
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'El campo "query" es requerido y debe ser un texto no vacío',
        type: 'ValidationError',
        field: 'query'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Validar longitud máxima
  if (query.length > 200) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'La consulta no puede exceder 200 caracteres',
        type: 'ValidationError',
        field: 'query'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Validar filtros opcionales
  if (filters && typeof filters !== 'object') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Los filtros deben ser un objeto',
        type: 'ValidationError',
        field: 'filters'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Validar opciones
  if (options && typeof options !== 'object') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Las opciones deben ser un objeto',
        type: 'ValidationError',
        field: 'options'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Validar límite de resultados
  if (options?.limit && (typeof options.limit !== 'number' || options.limit < 1 || options.limit > 50)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'El límite debe ser un número entre 1 y 50',
        type: 'ValidationError',
        field: 'options.limit'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

/**
 * Middleware de validación para búsqueda vectorial
 */
function validateVectorSearch(req, res, next) {
  const { question, options } = req.body;
  
  // Validar pregunta requerida
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'El campo "question" es requerido y debe ser un texto no vacío',
        type: 'ValidationError',
        field: 'question'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Validar longitud mínima y máxima
  if (question.length < 5) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'La pregunta debe tener al menos 5 caracteres',
        type: 'ValidationError',
        field: 'question'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  if (question.length > 500) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'La pregunta no puede exceder 500 caracteres',
        type: 'ValidationError',
        field: 'question'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Validar opciones
  if (options && typeof options !== 'object') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Las opciones deben ser un objeto',
        type: 'ValidationError',
        field: 'options'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Validar límite de resultados para búsqueda vectorial
  if (options?.limit && (typeof options.limit !== 'number' || options.limit < 1 || options.limit > 20)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'El límite para búsqueda vectorial debe ser un número entre 1 y 20',
        type: 'ValidationError',
        field: 'options.limit'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

export {
  validateKeywordSearch,
  validateVectorSearch
};