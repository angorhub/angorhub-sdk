import axios from 'axios';
import { NostrService } from './nostr-service';
export class AngorHubSDK {
    constructor(network = 'mainnet', config = {}) {
        var _a;
        this.indexers = [];
        this.healthyIndexers = [];
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.healthStatus = new Map();
        this.axiosInstances = new Map();
        this.requestQueue = [];
        this.activeRequests = 0;
        this.networks = {
            mainnet: [
                { url: 'https://fulcrum.angor.online/', isPrimary: true, priority: 1 },
                { url: 'https://electrs.angor.online/', isPrimary: false, priority: 2 },
            ],
            testnet: [
                { url: 'https://signet.angor.online/', isPrimary: true, priority: 1 }
            ]
        };
        this.network = network;
        // Get default Nostr relays for the network if none provided
        const defaultRelays = this.getDefaultNostrRelays(network);
        this.config = {
            timeout: config.timeout || 8000,
            useRemoteConfig: config.useRemoteConfig !== false,
            customIndexerUrl: config.customIndexerUrl || '',
            enableNostr: config.enableNostr !== false,
            nostrRelays: ((_a = config.nostrRelays) === null || _a === void 0 ? void 0 : _a.length) ? config.nostrRelays : defaultRelays,
            enableCache: config.enableCache !== false,
            cacheTtl: config.cacheTtl || 300000, // 5 minutes
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            healthCheckInterval: config.healthCheckInterval || 60000, // 1 minute
            enableCompression: config.enableCompression !== false,
            concurrentRequests: config.concurrentRequests || 10
        };
        console.log(`🔗 Initializing ${network} SDK with Nostr relays:`, this.config.nostrRelays);
        this.initializeIndexers();
        this.initializeNostrService();
        this.startHealthChecks();
    }
    getDefaultNostrRelays(network) {
        if (network === 'testnet') {
            return [
                "wss://relay.damus.io",
                "wss://relay.angor.io",
                "wss://nostr-relay.wlvs.space",
                "wss://relay.nostr.info",
                "wss://nos.lol",
                "wss://relay.current.fyi",
                "wss://nostr.wine",
                "wss://relay.orangepill.dev"
            ];
        }
        // Default mainnet relays
        return [
            "wss://relay.damus.io",
            "wss://relay.angor.io"
        ];
    }
    initializeIndexers() {
        if (this.config.customIndexerUrl) {
            this.indexers = [{ url: this.config.customIndexerUrl, isPrimary: true, priority: 1 }];
        }
        else {
            this.indexers = [...this.networks[this.network]];
        }
        this.healthyIndexers = [...this.indexers];
        this.initializeAxiosInstances();
    }
    initializeAxiosInstances() {
        this.indexers.forEach(indexer => {
            const axiosConfig = {
                baseURL: `${indexer.url}api/query/Angor/`,
                timeout: this.config.timeout,
                maxRedirects: 3,
                validateStatus: (status) => status < 500,
            };
            // Browser-safe headers - avoid setting compression headers in browser
            if (typeof window !== 'undefined') {
                // Browser environment
                axiosConfig.headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                };
            }
            else {
                // Node.js environment - can set compression headers
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
    initializeNostrService() {
        if (this.config.enableNostr) {
            this.nostrService = new NostrService(this.config.nostrRelays);
        }
    }
    getCacheKey(endpoint, params = {}) {
        const sortedParams = Object.keys(params).sort().reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});
        return `${this.network}:${endpoint}:${JSON.stringify(sortedParams)}`;
    }
    getFromCache(key) {
        if (!this.config.enableCache)
            return null;
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.timestamp + entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    setCache(key, data, ttl = this.config.cacheTtl) {
        if (!this.config.enableCache)
            return;
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }
    async checkIndexerHealth(indexer) {
        var _a;
        const startTime = Date.now();
        const health = {
            url: indexer.url,
            isHealthy: false,
            responseTime: 0,
            lastCheck: Date.now(),
            errorCount: ((_a = this.healthStatus.get(indexer.url)) === null || _a === void 0 ? void 0 : _a.errorCount) || 0
        };
        try {
            const axiosInstance = this.axiosInstances.get(indexer.url);
            if (!axiosInstance)
                throw new Error('No axios instance');
            const response = await axiosInstance.get('projects', {
                params: { limit: 1 },
                timeout: 5000
            });
            health.responseTime = Date.now() - startTime;
            health.isHealthy = response.status === 200;
            health.errorCount = 0;
        }
        catch (error) {
            health.responseTime = Date.now() - startTime;
            health.isHealthy = false;
            health.errorCount++;
        }
        this.healthStatus.set(indexer.url, health);
        return health;
    }
    async updateHealthyIndexers() {
        const healthChecks = await Promise.all(this.indexers.map(indexer => this.checkIndexerHealth(indexer)));
        this.healthyIndexers = this.indexers
            .filter(indexer => {
            const health = this.healthStatus.get(indexer.url);
            return (health === null || health === void 0 ? void 0 : health.isHealthy) && health.errorCount < 5;
        })
            .sort((a, b) => {
            const healthA = this.healthStatus.get(a.url);
            const healthB = this.healthStatus.get(b.url);
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return ((healthA === null || healthA === void 0 ? void 0 : healthA.responseTime) || Infinity) - ((healthB === null || healthB === void 0 ? void 0 : healthB.responseTime) || Infinity);
        });
        if (this.healthyIndexers.length === 0) {
            this.healthyIndexers = [...this.indexers];
        }
    }
    startHealthChecks() {
        this.updateHealthyIndexers();
        this.healthCheckTimer = setInterval(() => {
            this.updateHealthyIndexers();
        }, this.config.healthCheckInterval);
    }
    async throttleRequest(requestFn) {
        if (this.activeRequests >= this.config.concurrentRequests) {
            return new Promise((resolve, reject) => {
                this.requestQueue.push(async () => {
                    try {
                        const result = await requestFn();
                        resolve(result);
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            });
        }
        this.activeRequests++;
        try {
            const result = await requestFn();
            return result;
        }
        finally {
            this.activeRequests--;
            if (this.requestQueue.length > 0) {
                const nextRequest = this.requestQueue.shift();
                if (nextRequest) {
                    setImmediate(() => nextRequest());
                }
            }
        }
    }
    async makeRequestWithRetry(endpoint, params = {}, requestConfig = {}) {
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
            const cached = this.getFromCache(cacheKey);
            if (cached !== null)
                return cached;
        }
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }
        const requestPromise = this.throttleRequest(async () => {
            let lastError = null;
            for (let attempt = 0; attempt <= config.retries; attempt++) {
                const healthyIndexers = this.healthyIndexers.length > 0 ? this.healthyIndexers : this.indexers;
                for (const indexer of healthyIndexers) {
                    try {
                        const axiosInstance = this.axiosInstances.get(indexer.url);
                        if (!axiosInstance)
                            continue;
                        const response = await axiosInstance.get(endpoint, {
                            params,
                            timeout: config.timeout
                        });
                        if (config.useCache && response.status === 200) {
                            this.setCache(cacheKey, response.data, config.cacheTtl);
                        }
                        return response.data;
                    }
                    catch (error) {
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
        }
        finally {
            this.pendingRequests.delete(cacheKey);
        }
    }
    async getProjects(limit = 10, offset = 0, useCache = true) {
        var _a;
        try {
            const response = await this.makeRequestWithRetry('projects', { limit, offset }, { useCache });
            // Add safety check for response structure
            let projects;
            if (Array.isArray(response)) {
                projects = response;
            }
            else if (response && Array.isArray(response.data)) {
                projects = response.data;
            }
            else if (response && Array.isArray(response.projects)) {
                projects = response.projects;
            }
            else {
                console.warn('⚠️ API response is not in expected format:', response);
                throw new Error(`API returned unexpected format. Expected array of projects, got: ${typeof response}`);
            }
            if (this.nostrService && projects.length > 0) {
                return await this.nostrService.enrichProjectsWithNostrData(projects);
            }
            return projects;
        }
        catch (error) {
            console.error('❌ Error fetching projects:', error);
            // If it's a 404 error, provide more helpful message
            if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                throw new Error(`Projects endpoint not found (404). This may indicate the ${this.network} indexer is not available or the API endpoint has changed.`);
            }
            throw error;
        }
    }
    async getProject(projectId, useCache = true) {
        const project = await this.makeRequestWithRetry(`projects/${projectId}`, {}, { useCache });
        if (this.nostrService) {
            return await this.nostrService.enrichProjectWithNostrData(project);
        }
        return project;
    }
    async getProjectStats(projectId, useCache = true) {
        return await this.makeRequestWithRetry(`projects/${projectId}/stats`, {}, { useCache, cacheTtl: 60000 });
    }
    async getProjectInvestments(projectId, limit = 10, offset = 0, useCache = true) {
        return await this.makeRequestWithRetry(`projects/${projectId}/investments`, { limit, offset }, { useCache });
    }
    async getInvestorInvestment(projectId, investorPublicKey, useCache = true) {
        return await this.makeRequestWithRetry(`projects/${projectId}/investments/${investorPublicKey}`, {}, { useCache });
    }
    async getMultipleProjects(projectIds, useCache = true) {
        const requests = projectIds.map(id => this.getProject(id, useCache));
        return await Promise.all(requests);
    }
    async getMultipleProjectStats(projectIds, useCache = true) {
        const requests = projectIds.map(id => this.getProjectStats(id, useCache));
        return await Promise.all(requests);
    }
    clearCache() {
        this.cache.clear();
        if (this.nostrService) {
            this.nostrService.clearCache();
        }
    }
    getCacheStats() {
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
    getHealthStatus() {
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
    destroy() {
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
//# sourceMappingURL=sdk.js.map