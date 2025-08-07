import type { AngorProject, AngorProjectDetails, AngorProjectStats, AngorInvestment, IndexerHealth, IndexerService } from './interfaces';
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
    constructor(network?: 'mainnet' | 'testnet', config?: SDKConfig);
    private initialize;
    private fetchRelayConfig;
    private fetchIndexerConfig;
    private getConfiguredNostrRelays;
    private getConfiguredIndexers;
    private getDefaultIndexers;
    private getDefaultNostrRelays;
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
    updateConfiguration(configMode: ConfigMode, options?: {
        configServiceUrl?: string;
        manualIndexers?: {
            mainnet?: string[];
            testnet?: string[];
        };
        manualRelays?: string;
    }): Promise<void>;
    refreshConfiguration(): Promise<void>;
    getConfigurationInfo(): {
        mode: ConfigMode;
        serviceUrl: string;
        indexers: IndexerService[];
        relaysCount: number;
        network: string;
    };
    destroy(): void;
}
