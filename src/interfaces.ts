export interface AngorProject {
  founderKey: string;
  projectIdentifier: string;
  createdOnBlock: number;
  trxId: string;
  nostrEventId: string;
  projectInfo?: ProjectInfo;
  metadata?: ProjectProfileMetadata;
}

export interface AngorProjectDetails extends AngorProject {
  totalInvestmentsCount: number;
}

export interface AngorProjectStats {
  investorCount: number;
  amountInvested: number;
  amountSpentSoFarByFounder: number;
  amountInPenalties: number;
  countInPenalties: number;
}

export interface AngorInvestment {
  investorPublicKey: string;
  totalAmount: number;
  transactionId: string;
  hashOfSecret: string;
  isSeeder: boolean;
}

export interface ProjectInfo {
  founderKey: string;
  founderRecoveryKey: string;
  projectIdentifier: string;
  nostrPubKey: string;
  startDate: number;
  endDate: number;
  penaltyDays: number;
  expiryDate: number;
  targetAmount: number;
  stages: [{ amountToRelease: number; releaseDate: number }];
  projectSeeders: { threshold: number; secretHashes: string[] }[];
}

export interface ProjectProfileMetadata {
  name?: string;
  about?: string;
  picture?: string;
  website?: string;
  nip05?: string;
  lud16?: string;
  display_name?: string;
  banner?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  useCache?: boolean;
  cacheTtl?: number;
}

export interface IndexerHealth {
  url: string;
  isHealthy: boolean;
  responseTime: number;
  lastCheck: number;
  errorCount: number;
}

export interface BatchNostrRequest {
  eventIds: string[];
  pubKeys: string[];
  resolver: (results: Map<string, any>) => void;
  rejecter: (error: Error) => void;
}

export interface IndexerService {
  url: string;
  isPrimary: boolean;
}

export interface RelayConfig {
  mainnet: string[];
  testnet: string[];
}

export interface IndexerConfig {
  mainnet: IndexerService[];
  testnet: IndexerService[];
}
