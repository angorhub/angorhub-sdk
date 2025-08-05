import { AngorHubSDK } from '../src';

async function demonstrateOptimizedSDK() {
  console.log('🚀 AngorHub SDK - Optimized Performance Demo\n');

  // Initialize SDK with optimized configuration
  const sdk = new AngorHubSDK('mainnet', {
    enableCache: true,
    cacheTtl: 300_000, // 5 minutes cache
    maxRetries: 3,
    retryDelay: 1000,
    enableCompression: true,
    concurrentRequests: 15,
    healthCheckInterval: 30_000, // 30 seconds
    enableNostr: true
  });

  try {
    // 1. Basic Performance Test
    console.log('📊 Performance Test: Fetching projects...');
    let start = Date.now();
    const projects = await sdk.getProjects(10, 0);
    let duration = Date.now() - start;
    console.log(`✅ First call: ${duration}ms - Fetched ${projects.length} projects`);

    // 2. Cache Performance Test
    console.log('\n🚀 Testing cache performance...');
    start = Date.now();
    const cachedProjects = await sdk.getProjects(10, 0);
    duration = Date.now() - start;
    console.log(`⚡ Cached call: ${duration}ms - Same data retrieved from cache`);

    // 3. Batch Operations
    if (projects.length >= 3) {
      console.log('\n📦 Testing batch operations...');
      const projectIds = projects.slice(0, 3).map(p => p.projectIdentifier);
      
      start = Date.now();
      const batchResults = await sdk.getMultipleProjects(projectIds);
      duration = Date.now() - start;
      console.log(`🔄 Batch fetch: ${duration}ms - Retrieved ${batchResults.length} project details`);

      // Show Nostr enrichment
      const enrichedCount = batchResults.filter(p => p.projectInfo || p.metadata).length;
      console.log(`🌐 Nostr enrichment: ${enrichedCount}/${batchResults.length} projects enriched`);
    }

    // 4. Concurrent Requests Test
    console.log('\n⚡ Testing concurrent requests...');
    start = Date.now();
    const concurrentPromises = [
      sdk.getProjects(5, 0),
      sdk.getProjects(5, 5),
      sdk.getProjects(5, 10),
      projects.length > 0 ? sdk.getProject(projects[0].projectIdentifier) : Promise.resolve(null),
      projects.length > 0 ? sdk.getProjectStats(projects[0].projectIdentifier) : Promise.resolve(null)
    ];

    const concurrentResults = await Promise.all(concurrentPromises);
    duration = Date.now() - start;
    console.log(`🔀 Concurrent execution: ${duration}ms - ${concurrentResults.length} operations completed`);

    // 5. Health Status
    console.log('\n🏥 Indexer Health Status:');
    const health = sdk.getHealthStatus();
    health.indexers.forEach(indexer => {
      const status = indexer.isHealthy ? '✅' : '❌';
      console.log(`  ${status} ${indexer.url} - ${indexer.responseTime}ms (errors: ${indexer.errorCount})`);
    });
    console.log(`📊 Healthy indexers: ${health.healthyCount}/${health.indexers.length}`);

    // 6. Cache Statistics
    console.log('\n💾 Cache Statistics:');
    const cacheStats = sdk.getCacheStats();
    console.log(`  📦 SDK Cache: ${cacheStats.sdkCache.size} entries`);
    if (cacheStats.nostrCache) {
      console.log(`  🌐 Nostr Cache: ${cacheStats.nostrCache.size} entries`);
    }

    // 7. Configuration Info
    console.log('\n⚙️ Configuration Info:');
    const configInfo = sdk.getConfigInfo();
    console.log(`  🌍 Network: ${configInfo.network}`);
    console.log(`  🔗 Active Indexers: ${configInfo.currentHealthyIndexers}/${configInfo.totalIndexers}`);
    console.log(`  🚀 Active Requests: ${configInfo.activeRequests}`);
    console.log(`  📋 Queued Requests: ${configInfo.queuedRequests}`);
    console.log(`  💾 Cache Size: ${configInfo.cacheSize} entries`);

    // 8. Memory and Performance Optimization Demo
    console.log('\n🧹 Testing cache management...');
    console.log(`Cache before clear: ${sdk.getCacheStats().sdkCache.size} entries`);
    sdk.clearCache();
    console.log(`Cache after clear: ${sdk.getCacheStats().sdkCache.size} entries`);

    console.log('\n✨ Performance optimization demo completed successfully!');

  } catch (error) {
    console.error('❌ Error during demo:', error);
  } finally {
    // Cleanup
    sdk.destroy();
    console.log('\n🧹 SDK resources cleaned up');
  }
}

// Performance comparison function
async function performanceComparison() {
  console.log('\n📈 Performance Comparison: Optimized vs Basic Configuration\n');

  // Basic configuration (less optimized)
  const basicSDK = new AngorHubSDK('mainnet', {
    enableCache: false,
    enableNostr: false,
    maxRetries: 1,
    concurrentRequests: 3
  });

  // Optimized configuration
  const optimizedSDK = new AngorHubSDK('mainnet', {
    enableCache: true,
    cacheTtl: 300_000,
    enableNostr: true,
    maxRetries: 3,
    concurrentRequests: 15,
    enableCompression: true
  });

  try {
    // Test 1: Simple fetch
    console.log('🔍 Test 1: Fetching 10 projects');
    
    let start = Date.now();
    await basicSDK.getProjects(10, 0);
    let basicTime = Date.now() - start;
    
    start = Date.now();
    await optimizedSDK.getProjects(10, 0);
    let optimizedTime = Date.now() - start;
    
    console.log(`  Basic SDK: ${basicTime}ms`);
    console.log(`  Optimized SDK: ${optimizedTime}ms`);
    console.log(`  Improvement: ${Math.round(((basicTime - optimizedTime) / basicTime) * 100)}%\n`);

    // Test 2: Repeated fetch (cache test)
    console.log('🔄 Test 2: Repeated fetch (cache benefits)');
    
    start = Date.now();
    await basicSDK.getProjects(10, 0);
    basicTime = Date.now() - start;
    
    start = Date.now();
    await optimizedSDK.getProjects(10, 0); // Should hit cache
    optimizedTime = Date.now() - start;
    
    console.log(`  Basic SDK (no cache): ${basicTime}ms`);
    console.log(`  Optimized SDK (cached): ${optimizedTime}ms`);
    console.log(`  Cache speedup: ${Math.round((basicTime / optimizedTime))}x faster\n`);

    // Test 3: Concurrent operations
    console.log('⚡ Test 3: Concurrent operations');
    
    start = Date.now();
    await Promise.all([
      basicSDK.getProjects(5, 0),
      basicSDK.getProjects(5, 5),
      basicSDK.getProjects(5, 10)
    ]);
    basicTime = Date.now() - start;
    
    start = Date.now();
    await Promise.all([
      optimizedSDK.getProjects(5, 0),
      optimizedSDK.getProjects(5, 5),
      optimizedSDK.getProjects(5, 10)
    ]);
    optimizedTime = Date.now() - start;
    
    console.log(`  Basic SDK: ${basicTime}ms`);
    console.log(`  Optimized SDK: ${optimizedTime}ms`);
    console.log(`  Improvement: ${Math.round(((basicTime - optimizedTime) / basicTime) * 100)}%\n`);

  } catch (error) {
    console.error('❌ Error during performance comparison:', error);
  } finally {
    basicSDK.destroy();
    optimizedSDK.destroy();
  }
}

// Run the demos
async function runDemo() {
  await demonstrateOptimizedSDK();
  await performanceComparison();
}

if (require.main === module) {
  runDemo().catch(console.error);
}

export { demonstrateOptimizedSDK, performanceComparison };
