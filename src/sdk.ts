import axios from 'axios';
import { NostrService } from './nostr-service';
import type {
  AngorProject,
  AngorProjectDetails,
  AngorProjectStats,
  AngorInvestment
} from './interfaces';

interface Indexer {
  url: string;
  isPrimary: boolean;
}

interface SDKConfig {
  timeout?: number;
  useRemoteConfig?: boolean;
  customIndexerUrl?: string;
  enableNostr?: boolean;
  nostrRelays?: string[];
}

export class AngorHubSDK {
  private network: 'mainnet' | 'testnet';
  private config: SDKConfig;
  private indexers: Indexer[];
  private currentIndexer: Indexer;
  private nostrService?: NostrService;

  private networks = {
    mainnet: [
      { url: 'https://fulcrum.angor.online/', isPrimary: true },
      { url: 'https://indexer.angor.io/', isPrimary: false },
      { url: 'https://electrs.angor.online/', isPrimary: false }
    ],
    testnet: [
      { url: 'https://test.indexer.angor.io/', isPrimary: true },
      { url: 'https://signet.angor.online/', isPrimary: false }
    ]
  };

  constructor(network: 'mainnet' | 'testnet' = 'mainnet', config: SDKConfig = {}) {
    this.network = network;
    this.config = {
      timeout: config.timeout || 8000,
      useRemoteConfig: config.useRemoteConfig !== false,
      customIndexerUrl: config.customIndexerUrl,
      enableNostr: config.enableNostr !== false, // Default to true
      nostrRelays: config.nostrRelays,
    };

    if (this.config.customIndexerUrl) {
      this.indexers = [{ url: this.config.customIndexerUrl, isPrimary: true }];
    } else {
      this.indexers = this.networks[network];
    }

    this.currentIndexer = this.indexers.find(i => i.isPrimary) || this.indexers[0];

    // Initialize Nostr service if enabled
    if (this.config.enableNostr) {
      this.nostrService = new NostrService(this.config.nostrRelays);
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    for (const indexer of this.indexers) {
      try {
        const response = await axios.get<T>(`${indexer.url}api/query/Angor/${endpoint}`, {
          params,
          timeout: this.config.timeout
        });
        this.currentIndexer = indexer;
        return response.data;
      } catch (_) {}
    }
    throw new Error('All indexers failed');
  }

  async getProjects(limit = 10, offset = 0): Promise<AngorProject[]> {
    const projects = await this.makeRequest<AngorProject[]>('projects', { limit, offset });
    
    // Enhance with Nostr data if service is available
    if (this.nostrService) {
      return await this.nostrService.enrichProjectsWithNostrData(projects);
    }
    
    return projects;
  }

  async getProject(projectId: string): Promise<AngorProjectDetails> {
    const project = await this.makeRequest<AngorProjectDetails>(`projects/${projectId}`);
    
    // Enhance with Nostr data if service is available
    if (this.nostrService) {
      return await this.nostrService.enrichProjectWithNostrData(project);
    }
    
    return project;
  }

  async getProjectStats(projectId: string): Promise<AngorProjectStats> {
    return await this.makeRequest(`projects/${projectId}/stats`);
  }

  async getProjectInvestments(projectId: string, limit = 10, offset = 0): Promise<AngorInvestment[]> {
    return await this.makeRequest(`projects/${projectId}/investments`, { limit, offset });
  }

  async getInvestorInvestment(projectId: string, investorPublicKey: string): Promise<AngorInvestment> {
    return await this.makeRequest(`projects/${projectId}/investments/${investorPublicKey}`);
  }

  getConfigInfo() {
    return {
      network: this.network,
      currentIndexer: this.currentIndexer,
      availableIndexers: this.indexers,
      timestamp: new Date().toISOString()
    };
  }
}
