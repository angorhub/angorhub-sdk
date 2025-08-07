import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { NostrService } from './nostr-service';
import type {
  AngorProject,
  AngorProjectDetails,
  AngorProjectStats,
  AngorInvestment,
  CacheEntry,
  RequestConfig,
  IndexerHealth,
  IndexerService,
  RelayConfig,
  IndexerConfig
} from './interfaces';

export type ConfigMode = 'remote' | 'manual' | 'default';

export interface SDKConfig {
  timeout?: number;
  configMode?: ConfigMode;
  configServiceUrl?: string;
  customIndexerUrl?: string;
  manualIndexers?: {
    mainnet?: string[];
    testnet?: string[];
  };
  manualRelays?: string;
  enableNostr?: boolean;
  nostrRelays?: string[];
  enableCache?: boolean;
  cacheTtl?: number;
  maxRetries?: number;
  retryDelay?: number;
  healthCheckInterval?: number;
  enableCompression?: boolean;
  concurrentRequests?: number;
}

export class AngorHubSDK {
  private network: 'mainnet' | 'testnet';
  private config: Required<SDKConfig>;
  private indexers: IndexerService[] = [];
  private healthyIndexers: IndexerService[] = [];
  private nostrService?: NostrService;
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private healthStatus = new Map<string, IndexerHealth>();
  private healthCheckTimer?: NodeJS.Timeout;
  private axiosInstances = new Map<string, AxiosInstance>();
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests = 0;

  constructor(network: 'mainnet' | 'testnet' = 'mainnet', config: SDKConfig = {}) {
    this.network = network;
    
    const defaultRelays = this.getDefaultNostrRelays(network);
    
    this.config = {
      timeout: config.timeout || 8000,
      configMode: config.configMode || 'remote',
      configServiceUrl: config.configServiceUrl || 'https://angorhub.github.io/lists',
      customIndexerUrl: config.customIndexerUrl || '',
      manualIndexers: config.manualIndexers || {},
      manualRelays: config.manualRelays || '',
      enableNostr: config.enableNostr !== false,
      nostrRelays: config.nostrRelays?.length ? config.nostrRelays : defaultRelays,
      enableCache: config.enableCache !== false,
      cacheTtl: config.cacheTtl || 300_000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      healthCheckInterval: config.healthCheckInterval || 60_000,
      enableCompression: config.enableCompression !== false,
      concurrentRequests: config.concurrentRequests || 10
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.initializeIndexers();
    await this.initializeNostrService();
    this.startHealthChecks();
  }

  private async fetchRelayConfig(): Promise<RelayConfig | null> {
    try {
      const response = await axios.get(`${this.config.configServiceUrl}/relays.json`, {
        timeout: this.config.timeout
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  private async fetchIndexerConfig(): Promise<IndexerConfig | null> {
    try {
      const response = await axios.get(`${this.config.configServiceUrl}/indexers.json`, {
        timeout: this.config.timeout
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  private async getConfiguredNostrRelays(network: 'mainnet' | 'testnet'): Promise<string[]> {
    switch (this.config.configMode) {
      case 'remote':
        const relayConfig = await this.fetchRelayConfig();
        if (relayConfig && relayConfig[network]) {
          return relayConfig[network];
        }
        return this.getDefaultNostrRelays(network);
      
      case 'manual':
        if (this.config.manualRelays) {
          return this.config.manualRelays.split(',').map(relay => relay.trim());
        }
        return this.getDefaultNostrRelays(network);
      
      case 'default':
      default:
        return this.getDefaultNostrRelays(network);
    }
  }

  private async getConfiguredIndexers(network: 'mainnet' | 'testnet'): Promise<IndexerService[]> {
    switch (this.config.configMode) {
      case 'remote':
        const indexerConfig = await this.fetchIndexerConfig();
        if (indexerConfig && indexerConfig[network]) {
          return indexerConfig[network];
        }
        return this.getDefaultIndexers(network);
      
      case 'manual':
        if (this.config.manualIndexers && this.config.manualIndexers[network]) {
          return this.config.manualIndexers[network]!.map((url, index) => ({
            url: url.endsWith('/') ? url : url + '/',
            isPrimary: index === 0
          }));
        }
        return this.getDefaultIndexers(network);
      
      case 'default':
      default:
        return this.getDefaultIndexers(network);
    }
  }

  private getDefaultIndexers(network: 'mainnet' | 'testnet'): IndexerService[] {
    if (network === 'testnet') {
      return [
        { url: 'https://test.indexer.angor.io/', isPrimary: true },
        { url: 'https://signet.angor.online/', isPrimary: false }
      ];
    }
    
    return [
      { url: 'https://indexer.angor.io/', isPrimary: false },
      { url: 'https://fulcrum.angor.online/', isPrimary: true },
      { url: 'https://electrs.angor.online/', isPrimary: false }
    ];
  }

  private getDefaultNostrRelays(network: 'mainnet' | 'testnet'): string[] {
    if (network === 'testnet') {
      return [
        "wss://relay.damus.io",
        "wss://relay.primal.net",
        "wss://nos.lol",
        "wss://relay.angor.io",
        "wss://relay2.angor.io"
      ];
    }
    
    return [
        "wss://relay.damus.io",
        "wss://relay.primal.net",
        "wss://nos.lol",
        "wss://relay.angor.io",
        "wss://relay2.angor.io"
    ];
  }

  private async initializeIndexers(): Promise<void> {
    if (this.config.customIndexerUrl) {
      this.indexers = [{ url: this.config.customIndexerUrl, isPrimary: true }];
    } else {
      this.indexers = await this.getConfiguredIndexers(this.network);
    }

    this.healthyIndexers = [...this.indexers];
    this.initializeAxiosInstances();
  }

  private initializeAxiosInstances(): void {
    this.indexers.forEach(indexer => {
      const axiosConfig: AxiosRequestConfig = {
        baseURL: `${indexer.url}api/query/Angor/`,
        timeout: this.config.timeout,
        maxRedirects: 3,
        validateStatus: (status) => status < 500,
      };

      if (typeof window !== 'undefined') {
        axiosConfig.headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
      } else {
        axiosConfig.headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        
        if (this.config.enableCompression) {
          axiosConfig.headers['Accept-Encoding'] = 'gzip, deflate, br';
        }
      }

      this.axiosInstances.set(indexer.url, axios.create(axiosConfig));
    });
  }

  private async initializeNostrService(): Promise<void> {
    if (this.config.enableNostr) {
      const relays = await this.getConfiguredNostrRelays(this.network);
      this.nostrService = new NostrService(relays);
    }
  }

  private getCacheKey(endpoint: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params).sort().reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {} as Record<string, any>);
    
    return `${this.network}:${endpoint}:${JSON.stringify(sortedParams)}`;
  }

  private getFromCache<T>(key: string): T | null {
    if (!this.config.enableCache) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl = this.config.cacheTtl): void {
    if (!this.config.enableCache) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private async checkIndexerHealth(indexer: IndexerService): Promise<IndexerHealth> {
    const startTime = Date.now();
    const health: IndexerHealth = {
      url: indexer.url,
      isHealthy: false,
      responseTime: 0,
      lastCheck: Date.now(),
      errorCount: this.healthStatus.get(indexer.url)?.errorCount || 0
    };

    try {
      const axiosInstance = this.axiosInstances.get(indexer.url);
      if (!axiosInstance) throw new Error('No axios instance');

      const response = await axiosInstance.get('projects', {
        params: { limit: 1 },
        timeout: 5000
      });

      health.responseTime = Date.now() - startTime;
      health.isHealthy = response.status === 200;
      health.errorCount = 0;
    } catch (error) {
      health.responseTime = Date.now() - startTime;
      health.isHealthy = false;
      health.errorCount++;
    }

    this.healthStatus.set(indexer.url, health);
    return health;
  }

  private async updateHealthyIndexers(): Promise<void> {
    const healthChecks = await Promise.all(
      this.indexers.map(indexer => this.checkIndexerHealth(indexer))
    );

    this.healthyIndexers = this.indexers
      .filter(indexer => {
        const health = this.healthStatus.get(indexer.url);
        return health?.isHealthy && health.errorCount < 5;
      })
      .sort((a, b) => {
        const healthA = this.healthStatus.get(a.url);
        const healthB = this.healthStatus.get(b.url);
        
        if (a.isPrimary !== b.isPrimary) {
          return a.isPrimary ? -1 : 1;
        }
        
        return (healthA?.responseTime || Infinity) - (healthB?.responseTime || Infinity);
      });

    if (this.healthyIndexers.length === 0) {
      this.healthyIndexers = [...this.indexers];
    }
  }

  private startHealthChecks(): void {
    this.updateHealthyIndexers();

    this.healthCheckTimer = setInterval(() => {
      this.updateHealthyIndexers();
    }, this.config.healthCheckInterval);
  }

  private async throttleRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    if (this.activeRequests >= this.config.concurrentRequests) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push(async () => {
          try {
            const result = await requestFn();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    this.activeRequests++;
    
    try {
      const result = await requestFn();
      return result;
    } finally {
      this.activeRequests--;
      
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        if (nextRequest) {
          setImmediate(() => nextRequest());
        }
      }
    }
  }

  private async makeRequestWithRetry<T>(
    endpoint: string, 
    params: Record<string, any> = {},
    requestConfig: RequestConfig = {}
  ): Promise<T> {
    const config = {
      timeout: this.config.timeout,
      retries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      useCache: this.config.enableCache,
      cacheTtl: this.config.cacheTtl,
      ...requestConfig
    };

    const cacheKey = this.getCacheKey(endpoint, params);

    if (config.useCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached !== null) return cached;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<T>;
    }

    const requestPromise = this.throttleRequest(async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= config.retries; attempt++) {
        const healthyIndexers = this.healthyIndexers.length > 0 ? this.healthyIndexers : this.indexers;
        
        for (const indexer of healthyIndexers) {
          try {
            const axiosInstance = this.axiosInstances.get(indexer.url);
            if (!axiosInstance) continue;

            const response: AxiosResponse<T> = await axiosInstance.get(endpoint, {
              params,
              timeout: config.timeout
            });

            if (config.useCache && response.status === 200) {
              this.setCache(cacheKey, response.data, config.cacheTtl);
            }

            return response.data;
          } catch (error: any) {
            lastError = error;
            
            const health = this.healthStatus.get(indexer.url);
            if (health) {
              health.errorCount++;
              health.isHealthy = false;
            }

            continue;
          }
        }

        if (attempt < config.retries) {
          await new Promise(resolve => setTimeout(resolve, config.retryDelay * (attempt + 1)));
        }
      }

      throw lastError || new Error('All indexers failed');
    });

    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async getProjects(limit = 10, offset = 0, useCache = true): Promise<AngorProject[]> {
    try {
      const response = await this.makeRequestWithRetry<any>('projects', 
        { limit, offset }, 
        { useCache }
      );
      
      let projects: AngorProject[];
      if (Array.isArray(response)) {
        projects = response;
      } else if (response && Array.isArray(response.data)) {
        projects = response.data;
      } else if (response && Array.isArray(response.projects)) {
        projects = response.projects;
      } else {
        throw new Error(`API returned unexpected format. Expected array of projects, got: ${typeof response}`);
      }
      
      if (this.nostrService && projects.length > 0) {
        return await this.nostrService.enrichProjectsWithNostrData(projects);
      }
      
      return projects;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`Projects endpoint not found (404). This may indicate the ${this.network} indexer is not available or the API endpoint has changed.`);
      }
      
      throw error;
    }
  }

  async getProject(projectId: string, useCache = true): Promise<AngorProjectDetails> {
    const project = await this.makeRequestWithRetry<AngorProjectDetails>(
      `projects/${projectId}`, 
      {}, 
      { useCache }
    );
    
    if (this.nostrService) {
      return await this.nostrService.enrichProjectWithNostrData(project);
    }
    
    return project;
  }

  async getProjectStats(projectId: string, useCache = true): Promise<AngorProjectStats> {
    return await this.makeRequestWithRetry<AngorProjectStats>(
      `projects/${projectId}/stats`, 
      {}, 
      { useCache, cacheTtl: 60_000 }
    );
  }

  async getProjectInvestments(
    projectId: string, 
    limit = 10, 
    offset = 0, 
    useCache = true
  ): Promise<AngorInvestment[]> {
    return await this.makeRequestWithRetry<AngorInvestment[]>(
      `projects/${projectId}/investments`, 
      { limit, offset }, 
      { useCache }
    );
  }

  async getInvestorInvestment(
    projectId: string, 
    investorPublicKey: string, 
    useCache = true
  ): Promise<AngorInvestment> {
    return await this.makeRequestWithRetry<AngorInvestment>(
      `projects/${projectId}/investments/${investorPublicKey}`, 
      {}, 
      { useCache }
    );
  }

  async getMultipleProjects(projectIds: string[], useCache = true): Promise<AngorProjectDetails[]> {
    const requests = projectIds.map(id => this.getProject(id, useCache));
    return await Promise.all(requests);
  }

  async getMultipleProjectStats(projectIds: string[], useCache = true): Promise<AngorProjectStats[]> {
    const requests = projectIds.map(id => this.getProjectStats(id, useCache));
    return await Promise.all(requests);
  }

  clearCache(): void {
    this.cache.clear();
    if (this.nostrService) {
      this.nostrService.clearCache();
    }
  }

  getCacheStats(): { 
    sdkCache: { size: number; keys: string[] }; 
    nostrCache?: { size: number; keys: string[] } 
  } {
    const stats = {
      sdkCache: {
        size: this.cache.size,
        keys: Array.from(this.cache.keys())
      }
    };

    if (this.nostrService) {
      return {
        ...stats,
        nostrCache: this.nostrService.getCacheStats()
      };
    }

    return stats;
  }

  getHealthStatus(): { indexers: IndexerHealth[]; healthyCount: number } {
    return {
      indexers: Array.from(this.healthStatus.values()),
      healthyCount: this.healthyIndexers.length
    };
  }

  getConfigInfo() {
    return {
      network: this.network,
      config: this.config,
      currentHealthyIndexers: this.healthyIndexers.length,
      totalIndexers: this.indexers.length,
      cacheSize: this.cache.size,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      timestamp: new Date().toISOString()
    };
  }

  async updateConfiguration(configMode: ConfigMode, options?: {
    configServiceUrl?: string;
    manualIndexers?: { mainnet?: string[]; testnet?: string[] };
    manualRelays?: string;
  }): Promise<void> {
    this.config.configMode = configMode;
    
    if (options?.configServiceUrl) {
      this.config.configServiceUrl = options.configServiceUrl;
    }
    
    if (options?.manualIndexers) {
      this.config.manualIndexers = options.manualIndexers;
    }
    
    if (options?.manualRelays) {
      this.config.manualRelays = options.manualRelays;
    }

    await this.initialize();
  }

  async refreshConfiguration(): Promise<void> {
    this.clearCache();
    await this.initialize();
  }

  getConfigurationInfo(): {
    mode: ConfigMode;
    serviceUrl: string;
    indexers: IndexerService[];
    relaysCount: number;
    network: string;
  } {
    return {
      mode: this.config.configMode,
      serviceUrl: this.config.configServiceUrl,
      indexers: this.indexers,
      relaysCount: this.config.nostrRelays.length,
      network: this.network
    };
  }

  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    this.clearCache();
    this.pendingRequests.clear();
    this.requestQueue.length = 0;

    if (this.nostrService) {
      this.nostrService.disconnect();
    }

    this.axiosInstances.clear();
  }
}
