import type { ProjectInfo, ProjectProfileMetadata } from './interfaces';
export declare class NostrService {
    private ndk;
    private isInitialized;
    private cache;
    private pendingRequests;
    private batchQueue;
    private batchTimeout;
    private readonly BATCH_DELAY;
    private readonly BATCH_SIZE;
    private readonly DEFAULT_CACHE_TTL;
    constructor(relays?: string[]);
    initialize(): Promise<void>;
    private getCacheKey;
    private getFromCache;
    private setCache;
    private deduplicateRequest;
    getProjectInfo(nostrEventId: string, useCache?: boolean): Promise<ProjectInfo | null>;
    getProfileMetadata(nostrPubKey: string, useCache?: boolean): Promise<ProjectProfileMetadata | null>;
    private processBatch;
    private scheduleBatch;
    enrichProjectWithNostrData(project: any): Promise<any>;
    enrichProjectsWithNostrData(projects: any[]): Promise<any[]>;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        keys: string[];
    };
    disconnect(): void;
}
