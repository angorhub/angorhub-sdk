import type { AngorProject, AngorProjectDetails, AngorProjectStats, AngorInvestment, IndexerHealth } from './interfaces';
interface SDKConfig {
    timeout?: number;
    useRemoteConfig?: boolean;
    customIndexerUrl?: string;
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
export declare class AngorHubSDK {
    private network;
    private config;
    private indexers;
    private healthyIndexers;
    private nostrService?;
    private cache;
    private pendingRequests;
    private healthStatus;
    private healthCheckTimer?;
    private axiosInstances;
    private requestQueue;
    private activeRequests;
    private networks;
    constructor(network?: 'mainnet' | 'testnet', config?: SDKConfig);
    private initializeIndexers;
    private initializeAxiosInstances;
    private initializeNostrService;
    private getCacheKey;
    private getFromCache;
    private setCache;
    private checkIndexerHealth;
    private updateHealthyIndexers;
    private startHealthChecks;
    private throttleRequest;
    private makeRequestWithRetry;
    getProjects(limit?: number, offset?: number, useCache?: boolean): Promise<AngorProject[]>;
    getProject(projectId: string, useCache?: boolean): Promise<AngorProjectDetails>;
    getProjectStats(projectId: string, useCache?: boolean): Promise<AngorProjectStats>;
    getProjectInvestments(projectId: string, limit?: number, offset?: number, useCache?: boolean): Promise<AngorInvestment[]>;
    getInvestorInvestment(projectId: string, investorPublicKey: string, useCache?: boolean): Promise<AngorInvestment>;
    getMultipleProjects(projectIds: string[], useCache?: boolean): Promise<AngorProjectDetails[]>;
    getMultipleProjectStats(projectIds: string[], useCache?: boolean): Promise<AngorProjectStats[]>;
    clearCache(): void;
    getCacheStats(): {
        sdkCache: {
            size: number;
            keys: string[];
        };
        nostrCache?: {
            size: number;
            keys: string[];
        };
    };
    getHealthStatus(): {
        indexers: IndexerHealth[];
        healthyCount: number;
    };
    getConfigInfo(): {
        network: "mainnet" | "testnet";
        config: Required<SDKConfig>;
        currentHealthyIndexers: number;
        totalIndexers: number;
        cacheSize: number;
        activeRequests: number;
        queuedRequests: number;
        timestamp: string;
    };
    destroy(): void;
}
export {};
