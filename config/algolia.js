/**
 * Configuración de Algolia para la PoC de Farmatodo
 * En producción, estas variables vendrían de process.env
 */

const algoliaConfigured = 
  !!process.env.ALGOLIA_APP_ID &&
  !!process.env.ALGOLIA_ADMIN_KEY &&
  !!process.env.ALGOLIA_SEARCH_KEY;

const openaiConfigured = !!process.env.OPENAI_API_KEY;

const config = {
  algolia: {
    appId: process.env.ALGOLIA_APP_ID,
    searchApiKey: process.env.ALGOLIA_SEARCH_KEY, 
    adminApiKey: process.env.ALGOLIA_ADMIN_KEY,
    indexName: process.env.ALGOLIA_INDEX_NAME || 'farmatodo_products_poc',
    isConfigured: algoliaConfigured
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-ada-002',
    maxTokens: 8191, // Límite para text-embedding-ada-002
    isConfigured: openaiConfigured
  },
  validation: {
    algoliaConfigured,
    openaiConfigured,
    missingKeys: [
      ...(!process.env.ALGOLIA_APP_ID ? ['ALGOLIA_APP_ID'] : []),
      ...(!process.env.ALGOLIA_ADMIN_KEY ? ['ALGOLIA_ADMIN_KEY'] : []),
      ...(!process.env.ALGOLIA_SEARCH_KEY ? ['ALGOLIA_SEARCH_KEY'] : []),
      ...(!process.env.OPENAI_API_KEY ? ['OPENAI_API_KEY'] : []),
    ]
  }
};

export default config;