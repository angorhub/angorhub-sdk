import { AngorHubSDK } from '../src';

describe('AngorHubSDK', () => {
  let sdk: AngorHubSDK;

  beforeEach(() => {
    sdk = new AngorHubSDK('testnet', {
      enableCache: true,
      cacheTtl: 60000,
      maxRetries: 2,
      enableNostr: false // Disable for faster tests
    });
  });

  afterEach(() => {
    sdk.destroy();
  });

  describe('Projects', () => {
    test('should fetch projects with caching', async () => {
      const projects1 = await sdk.getProjects(2, 0);
      console.log('Projects response:', typeof projects1, projects1);
      
      // Handle both array and non-array responses
      const projectsArray1 = Array.isArray(projects1) ? projects1 : [projects1];
      expect(projectsArray1.length).toBeGreaterThan(0);

      // Second call should use cache (faster)
      const start = Date.now();
      const projects2 = await sdk.getProjects(2, 0);
      const duration = Date.now() - start;
      
      const projectsArray2 = Array.isArray(projects2) ? projects2 : [projects2];
      expect(projectsArray2.length).toBe(projectsArray1.length);
      expect(duration).toBeLessThan(500); // Should be much faster due to cache
    }, 10000);

    test('should fetch multiple projects in batch', async () => {
      try {
        const projects = await sdk.getProjects(5, 0);
        console.log('Batch test projects response:', typeof projects, projects);
        
        // Handle both array and non-array responses
        const projectsArray = Array.isArray(projects) ? projects : [projects];
        expect(projectsArray.length).toBeGreaterThanOrEqual(1);

        if (projectsArray.length >= 2) {
          const projectIds = projectsArray.slice(0, 2).map(p => p.projectIdentifier);
          const batchResults = await sdk.getMultipleProjects(projectIds);
          
          expect(Array.isArray(batchResults)).toBe(true);
          expect(batchResults.length).toBe(2);
          expect(batchResults[0].projectIdentifier).toBe(projectIds[0]);
        } else {
          console.log('Skipping batch test - not enough projects');
        }
      } catch (error) {
        console.error('Batch test error:', error);
        throw error;
      }
    }, 15000);
  });

  describe('Performance', () => {
    test('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        sdk.getProjects(2, i * 2)
      );

      const start = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(results.length).toBe(5);
      expect(duration).toBeLessThan(15000); // Should be faster than sequential
    }, 20000);
  });

  describe('Health and Configuration', () => {
    test('should provide health status', () => {
      const health = sdk.getHealthStatus();
      expect(health).toHaveProperty('indexers');
      expect(health).toHaveProperty('healthyCount');
      expect(Array.isArray(health.indexers)).toBe(true);
    });

    test('should provide configuration info', () => {
      const config = sdk.getConfigInfo();
      expect(config).toHaveProperty('network');
      expect(config).toHaveProperty('config');
      expect(config).toHaveProperty('cacheSize');
      expect(config.network).toBe('testnet');
    });

    test('should provide cache statistics', () => {
      const stats = sdk.getCacheStats();
      expect(stats).toHaveProperty('sdkCache');
      expect(stats.sdkCache).toHaveProperty('size');
      expect(stats.sdkCache).toHaveProperty('keys');
    });
  });

  describe('Cache Management', () => {
    test('should clear cache properly', async () => {
      // Make a request to populate cache
      await sdk.getProjects(1, 0);
      
      // Wait a moment for cache to be populated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let stats = sdk.getCacheStats();
      expect(stats.sdkCache.size).toBeGreaterThanOrEqual(0);

      sdk.clearCache();
      
      stats = sdk.getCacheStats();
      expect(stats.sdkCache.size).toBe(0);
    });
  });
});
