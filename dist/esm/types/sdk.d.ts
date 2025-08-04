import type { AngorProject, AngorProjectDetails, AngorProjectStats, AngorInvestment } from './interfaces';
interface Indexer {
    url: string;
    isPrimary: boolean;
}
interface SDKConfig {
    timeout?: number;
    useRemoteConfig?: boolean;
    customIndexerUrl?: string;
}
export declare class AngorHubSDK {
    private network;
    private config;
    private indexers;
    private currentIndexer;
    private networks;
    constructor(network?: 'mainnet' | 'testnet', config?: SDKConfig);
    private makeRequest;
    getProjects(limit?: number, offset?: number): Promise<AngorProject[]>;
    getProject(projectId: string): Promise<AngorProjectDetails>;
    getProjectStats(projectId: string): Promise<AngorProjectStats>;
    getProjectInvestments(projectId: string, limit?: number, offset?: number): Promise<AngorInvestment[]>;
    getInvestorInvestment(projectId: string, investorPublicKey: string): Promise<AngorInvestment>;
    getConfigInfo(): {
        network: "mainnet" | "testnet";
        currentIndexer: Indexer;
        availableIndexers: Indexer[];
        timestamp: string;
    };
}
export {};
