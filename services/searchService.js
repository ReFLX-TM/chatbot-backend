import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const algoliasearch = require('algoliasearch').default;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
import algoliaConfig from '../config/algolia.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache para los productos
let productsCache = null;

// 1. Inicializar clientes
let algoliaClient;
let openAIClient;
let index;

// Inicializar cliente de Algolia si está configurado
if (algoliaConfig.isConfigured) {
  try {
    algoliaClient = algoliasearch(algoliaConfig.appId, algoliaConfig.adminApiKey);
    index = algoliaClient.initIndex(algoliaConfig.indexName);
    console.log('✅ Cliente de Algolia inicializado.');
  } catch (error) {
    console.error('❌ Error inicializando cliente de Algolia:', error);
    algoliaConfig.isConfigured = false; // Marcar como no configurado si falla
  }
} else {
  console.log('⚠️  Algolia no está configurado. La búsqueda por palabra clave usará mock.');
}

// Inicializar cliente de OpenAI si está configurado
if (algoliaConfig.openai.isConfigured) {
  try {
    openAIClient = new OpenAI({ apiKey: algoliaConfig.openai.apiKey });
    console.log('✅ Cliente de OpenAI inicializado.');
  } catch (error) {
    console.error('❌ Error inicializando cliente de OpenAI:', error);
    algoliaConfig.openai.isConfigured = false; // Marcar como no configurado si falla
  }
} else {
  console.log('⚠️  OpenAI no está configurado. La búsqueda vectorial usará mock.');
}

/**
 * Cargar productos desde el archivo JSON
 */
function loadProducts() {
  if (productsCache) {
    return productsCache;
  }

  try {
    const productsPath = path.join(__dirname, '../data/products.json');
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    
    // Enriquecer productos con datos adicionales para búsqueda
    productsCache = productsData.map(product => ({
      ...product,
      searchText: `${product.name} ${product.brand} ${product.description} ${product.tags.join(' ')} ${product.category} ${product.subcategory} ${product.active_ingredient}`.toLowerCase()
    }));
    
    console.log(`✅ Productos cargados: ${productsCache.length}`);
    return productsCache;
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
    return [];
  }
}

/**
 * Calcular score de relevancia para un producto
 */
function calculateScore(product, searchTerms) {
  let score = 0;
  let matchedTerms = 0;
  let hasDirectMatch = false;
  const lowerName = product.name.toLowerCase();
  const lowerBrand = product.brand.toLowerCase();
  const lowerDescription = product.description.toLowerCase();
  const lowerTags = product.tags.map(tag => tag.toLowerCase());
  const lowerCategory = product.category.toLowerCase();
  const lowerSubcategory = product.subcategory.toLowerCase();
  const lowerPresentation = product.presentation.toLowerCase();
  const lowerActiveIngredient = product.active_ingredient.toLowerCase();
  
  searchTerms.forEach(term => {
    const lowerTerm = term.toLowerCase();
    let termMatched = false;
    
    // Nombre del producto (peso alto)
    if (lowerName.includes(lowerTerm)) {
      score += 10;
      if (lowerName.startsWith(lowerTerm)) score += 5; // Bonus por empezar con el término
      termMatched = true;
      hasDirectMatch = true;
    }
    
    // Marca (peso medio-alto)
    if (lowerBrand.includes(lowerTerm)) {
      score += 8;
      termMatched = true;
      hasDirectMatch = true;
    }
    
    // Tags (peso medio)
    lowerTags.forEach(tag => {
      if (tag.includes(lowerTerm)) {
        score += 6;
        termMatched = true;
        hasDirectMatch = true;
      }
    });
    
    // Presentación (importante para productos específicos como "gel")
    if (lowerPresentation.includes(lowerTerm)) {
      score += 8;
      termMatched = true;
      hasDirectMatch = true;
    }
    
    // Categoría y subcategoría (peso medio)
    if (lowerCategory.includes(lowerTerm)) {
      score += 5;
      termMatched = true;
    }
    if (lowerSubcategory.includes(lowerTerm)) {
      score += 5;
      termMatched = true;
    }
    
    // Ingrediente activo (peso medio)
    if (lowerActiveIngredient.includes(lowerTerm)) {
      score += 5;
      termMatched = true;
    }
    
    // Descripción (peso bajo - solo si hay match directo en otros campos)
    if (lowerDescription.includes(lowerTerm)) {
      score += hasDirectMatch ? 3 : 1; // Menos peso si no hay match directo
      termMatched = true;
    }
    
    if (termMatched) {
      matchedTerms++;
    }
  });
  
  // REGLAS ESTRICTAS DE RELEVANCIA
  const termMatchRatio = matchedTerms / searchTerms.length;
  
  // Si busca múltiples términos, debe coincidir con al menos 60%
  if (searchTerms.length > 1 && termMatchRatio < 0.6) {
    score *= 0.1; // Penalización severa
  }
  
  // Si no hay match directo en campos importantes, penalizar mucho
  if (!hasDirectMatch) {
    score *= 0.2;
  }
  
  // Para búsquedas específicas como "gel", debe tener match directo
  const specificTerms = ['gel', 'shampoo', 'jarabe', 'tabletas', 'cápsulas'];
  const hasSpecificTerm = searchTerms.some(term => 
    specificTerms.includes(term.toLowerCase())
  );
  
  if (hasSpecificTerm) {
    const hasSpecificMatch = searchTerms.some(term => {
      const lowerTerm = term.toLowerCase();
      return lowerName.includes(lowerTerm) || 
             lowerPresentation.includes(lowerTerm) ||
             lowerTags.some(tag => tag.includes(lowerTerm));
    });
    
    if (!hasSpecificMatch) {
      score *= 0.05; // Penalización muy severa
    }
  }
  
  // Bonus por coincidencia de múltiples términos
  if (matchedTerms > 1) {
    score *= (1 + (matchedTerms - 1) * 0.2);
  }
  
  return score;
}

/**
 * Búsqueda tradicional por palabras clave en Algolia
 */
export async function searchKeyword(query, filters = {}, options = {}) {
  // Si Algolia no está configurado, usar mock search
  if (!algoliaConfig.isConfigured || !index) {
    console.log('Mock search (keyword):', query);
    const allProducts = loadProducts();
    const searchTerms = mapQuestionToTerms(query);

    const filteredProducts = allProducts.map(product => {
      const score = calculateScore(product, searchTerms);
      return { ...product, _score: score };
    }).filter(product => product._score > 0);

    // Ordenar por score descendente
    filteredProducts.sort((a, b) => b._score - a._score);

    return {
      hits: filteredProducts.slice(0, options.limit || 10),
      nbHits: filteredProducts.length,
      page: 0,
      nbPages: 1
    };
  }

  try {
    const searchOptions = {
      hitsPerPage: options.limit || 10,
      page: options.page || 0,
      // Aquí puedes añadir más opciones de búsqueda de Algolia si es necesario
    };

    console.log('📡 Enviando búsqueda a Algolia (keyword):', { query, searchOptions });
    const results = await index.search(query, searchOptions);
    console.log(`✅ Resultados de Algolia (keyword): ${results.nbHits} hits`);

    return results;

  } catch (error) {
    console.error('❌ Error en la búsqueda de Algolia (keyword):', error);
    throw error; // Re-lanzar para que el manejador de errores de la ruta lo capture
  }
}

/**
 * Generar embedding para una consulta usando OpenAI
 */
async function getQueryEmbedding(query) {
  if (!algoliaConfig.openai.isConfigured || !openAIClient) {
    console.error('❌ Cliente de OpenAI no inicializado para embedding.');
    return null;
  }

  try {
    console.log('🧠 Generando embedding con OpenAI para:', `"${query}"`);
    const response = await openAIClient.embeddings.create({
      model: algoliaConfig.openai.model,
      input: query,
    });
    console.log('✅ Embedding generado correctamente.');
    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ Error generando embedding de OpenAI:', error);
    throw error;
  }
}

/**
 * Búsqueda vectorial semántica en Algolia usando embeddings de OpenAI
 */
export async function searchVector(question, options = {}) {
  if (!algoliaConfig.isConfigured || !algoliaConfig.openai.isConfigured || !index) {
    console.log('Mock search (vector):', question);
    return { hits: [], nbHits: 0, page: 0, nbPages: 0, processingTimeMS: 0 };
  }

  try {
    // 1. Generar el embedding de la pregunta del usuario
    const queryVector = await getQueryEmbedding(question);
    if (!queryVector) {
      throw new Error('No se pudo generar el embedding para la consulta.');
    }

    // 2. Realizar la búsqueda de similitud en Algolia
    const searchOptions = {
      query: '', // Usar query vacía para una búsqueda puramente vectorial
      customParameters: {
        // La forma de pasar el vector puede variar según la configuración del índice
        vector: JSON.stringify(queryVector)
      },
      hitsPerPage: options.limit || 10,
      page: options.page || 0,
    };

    console.log('📡 Enviando búsqueda a Algolia (vectorial) para:', `"${question}"`);
    const results = await index.search(searchOptions);
    console.log(`✅ Resultados de Algolia (vectorial): ${results.nbHits} hits`);

    return results;

  } catch (error) {
    console.error('❌ Error en la búsqueda vectorial de Algolia:', error);
    throw error;
  }
}

/**
 * Mapear preguntas naturales a términos de búsqueda
 */
function mapQuestionToTerms(question) {
  const lowerQuestion = question.toLowerCase();
  
  // Mapeos específicos para preguntas comunes
  const mappings = {
    // Acetaminofén y dolor
    'acetaminofén': ['acetaminofén'],
    'acetaminofen': ['acetaminofén'],
    'paracetamol': ['acetaminofén'],
    'dolor': ['acetaminofén', 'ibuprofeno', 'dolor'],
    'dolor de cabeza': ['acetaminofén', 'dolor'],
    'dolor cabeza': ['acetaminofén', 'dolor'],
    'cabeza': ['acetaminofén', 'dolor'],
    'fiebre': ['acetaminofén', 'fiebre'],
    'analgésico': ['acetaminofén', 'ibuprofeno'],
    'analgesico': ['acetaminofén', 'ibuprofeno'],
    
    // Económico/barato
    'económico': ['genérico'],
    'economico': ['genérico'],
    'barato': ['genérico'],
    'más barato': ['genérico'],
    'mas barato': ['genérico'],
    'genérico': ['genérico'],
    'generico': ['genérico'],
    
    // Cabello masculino
    'cabello': ['gel', 'shampoo', 'cabello'],
    'pelo': ['gel', 'shampoo', 'cabello'],
    'hombre': ['masculino', 'hombre'],
    'masculino': ['masculino', 'hombre'],
    'gel': ['gel'],
    'fijador': ['gel'],
    
    // Niños
    'niños': ['infantil', 'pediátrico', 'jarabe'],
    'niño': ['infantil', 'pediátrico', 'jarabe'],
    'bebé': ['infantil', 'pediátrico'],
    'bebe': ['infantil', 'pediátrico'],
    'infantil': ['infantil', 'pediátrico'],
    'pediátrico': ['pediátrico'],
    'pediatrico': ['pediátrico'],
    'jarabe': ['jarabe'],
    
    // Otros
    'vitaminas': ['vitaminas', 'complejo'],
    'cansancio': ['vitaminas', 'complejo'],
    'fatiga': ['vitaminas', 'complejo'],
    'caspa': ['anticaspa', 'shampoo'],
    'anticaspa': ['anticaspa']
  };
  
  // Extraer términos relevantes
  let extractedTerms = [];
  
  // Buscar mapeos directos
  Object.keys(mappings).forEach(key => {
    if (lowerQuestion.includes(key)) {
      extractedTerms.push(...mappings[key]);
    }
  });
  
  // Si no encontramos mapeos específicos, usar palabras clave de la pregunta
  if (extractedTerms.length === 0) {
    const words = lowerQuestion
      .replace(/[¿?¡!.,;:]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !['que', 'cual', 'cuál', 'para', 'con', 'por', 'más', 'mas', 'menos', 'muy', 'qué', 'cómo', 'como', 'dónde', 'donde', 'cuándo', 'cuando', 'necesito', 'quiero', 'busco', 'recomiendas', 'recomiendan'].includes(word)
      );
    extractedTerms = words;
  }
  
  // Eliminar duplicados
  extractedTerms = [...new Set(extractedTerms)];
  
  console.log(`🤖 Pregunta: "${question}" → Términos: [${extractedTerms.join(', ')}]`);
  return extractedTerms;
}