import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock de configuración de Algolia
const ALGOLIA_CONFIG = {
  appId: 'MOCK_APP_ID',
  adminApiKey: 'MOCK_ADMIN_KEY',
  indexName: 'farmatodo_products_poc'
};

// Mock de configuración de OpenAI
const OPENAI_CONFIG = {
  apiKey: 'MOCK_OPENAI_KEY',
  model: 'text-embedding-ada-002'
};

/**
 * Mock de la función para generar embeddings
 * En producción, esto haría una llamada real a OpenAI
 */
async function generateEmbedding(text) {
  console.log(`🤖 Generando embedding para: "${text.substring(0, 50)}..."`);
  
  // Simulamos una llamada a OpenAI generando un vector mock
  // En producción sería: const response = await openai.embeddings.create({...})
  await new Promise(resolve => setTimeout(resolve, 100)); // Simular latencia
  
  // Vector mock de 1536 dimensiones (tamaño de text-embedding-ada-002)
  const mockVector = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
  
  return mockVector;
}

/**
 * Mock del cliente de Algolia
 */
class MockAlgoliaClient {
  constructor(appId, apiKey) {
    this.appId = appId;
    this.apiKey = apiKey;
    console.log(`🔗 Conectado a Algolia (Mock) - App ID: ${appId}`);
  }

  initIndex(indexName) {
    return new MockAlgoliaIndex(indexName);
  }
}

class MockAlgoliaIndex {
  constructor(indexName) {
    this.indexName = indexName;
    this.objects = [];
  }

  async saveObjects(objects) {
    console.log(`📤 Subiendo ${objects.length} objetos al índice ${this.indexName}`);
    this.objects.push(...objects);
    
    // Simular respuesta de Algolia
    return {
      objectIDs: objects.map(obj => obj.id),
      taskID: Math.floor(Math.random() * 1000000)
    };
  }

  async search(query, options = {}) {
    console.log(`🔍 Buscando: "${query}" en índice ${this.indexName}`);
    
    // Mock de búsqueda simple por nombre y descripción
    const results = this.objects.filter(obj => 
      obj.name.toLowerCase().includes(query.toLowerCase()) ||
      obj.description.toLowerCase().includes(query.toLowerCase()) ||
      obj.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );

    return {
      hits: results.slice(0, options.hitsPerPage || 10),
      nbHits: results.length,
      page: options.page || 0,
      nbPages: Math.ceil(results.length / (options.hitsPerPage || 10))
    };
  }
}

/**
 * Función principal de indexación
 */
async function indexProducts() {
  try {
    console.log('🚀 Iniciando proceso de indexación de productos Farmatodo...\n');

    // 1. Leer datos de productos
    const productsPath = path.join(__dirname, '../data/products.json');
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    
    console.log(`📦 Cargados ${productsData.length} productos desde ${productsPath}`);

    // 2. Inicializar cliente de Algolia (mock)
    const client = new MockAlgoliaClient(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.adminApiKey);
    const index = client.initIndex(ALGOLIA_CONFIG.indexName);

    // 3. Procesar cada producto para generar embeddings
    const enrichedProducts = [];
    
    for (let i = 0; i < productsData.length; i++) {
      const product = productsData[i];
      console.log(`\n📋 Procesando producto ${i + 1}/${productsData.length}: ${product.name}`);
      
      // Crear texto para embedding combinando campos relevantes
      const textForEmbedding = `${product.name} ${product.brand} ${product.description} ${product.tags.join(' ')}`;
      
      // Generar embedding
      const embedding = await generateEmbedding(textForEmbedding);
      
      // Enriquecer producto con vector
      const enrichedProduct = {
        ...product,
        _vector: embedding
      };
      
      enrichedProducts.push(enrichedProduct);
      console.log(`✅ Embedding generado (${embedding.length} dimensiones)`);
    }

    // 4. Subir productos enriquecidos a Algolia
    console.log('\n📤 Subiendo productos enriquecidos a Algolia...');
    const response = await index.saveObjects(enrichedProducts);
    
    console.log(`✅ Indexación completada exitosamente!`);
    console.log(`📊 Productos indexados: ${enrichedProducts.length}`);
    console.log(`🆔 Task ID: ${response.taskID}`);
    
    // 5. Guardar productos enriquecidos localmente para referencia
    const enrichedPath = path.join(__dirname, '../data/products_with_embeddings.json');
    fs.writeFileSync(enrichedPath, JSON.stringify(enrichedProducts, null, 2));
    console.log(`💾 Productos enriquecidos guardados en: ${enrichedPath}`);

    // 6. Prueba rápida de búsqueda
    console.log('\n🧪 Realizando prueba de búsqueda...');
    const searchResult = await index.search('acetaminofén');
    console.log(`🔍 Resultados para "acetaminofén": ${searchResult.nbHits} productos encontrados`);
    
    return {
      success: true,
      indexed: enrichedProducts.length,
      taskId: response.taskID
    };

  } catch (error) {
    console.error('❌ Error durante la indexación:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  indexProducts()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 ¡Proceso de indexación completado exitosamente!');
        process.exit(0);
      } else {
        console.log('\n💥 Error en el proceso de indexación');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { indexProducts, MockAlgoliaClient };