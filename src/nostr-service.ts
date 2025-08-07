import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import type { ProjectInfo, ProjectProfileMetadata, CacheEntry, BatchNostrRequest } from './interfaces';

export class NostrService {
  private ndk: NDK;
  private isInitialized: boolean = false;
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private batchQueue: BatchNostrRequest[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50;
  private readonly BATCH_SIZE = 20;
  private readonly DEFAULT_CACHE_TTL = 300_000;

  constructor(
    relays: string[] = [
      "wss://relay.damus.io",
      "wss://relay.primal.net", 
      "wss://nos.lol",
      "wss://relay.angor.io",
      "wss://relay2.angor.io"
    ]
  ) {
    try {
      this.ndk = new NDK({
        explicitRelayUrls: relays,
        enableOutboxModel: false
      });
    } catch (error) {
      this.ndk = new NDK({
        explicitRelayUrls: relays.slice(0, 2)
      });
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.ndk.connect();
      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
    }
  }

  private getCacheKey(type: 'project' | 'profile', id: string): string {
    return `${type}:${id}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  async getProjectInfo(nostrEventId: string, useCache = true): Promise<ProjectInfo | null> {
    const cacheKey = this.getCacheKey('project', nostrEventId);
    
    if (useCache) {
      const cached = this.getFromCache<ProjectInfo>(cacheKey);
      if (cached) return cached;
    }

    return this.deduplicateRequest(cacheKey, async () => {
      try {
        await this.initialize();
        if (!this.isInitialized) return null;

        const filter: NDKFilter = {
          ids: [nostrEventId],
          kinds: [3030 as any, 30078 as any],
          limit: 1
        };

        const events = await this.ndk.fetchEvents(filter);
        
        if (events.size === 0) {
          this.setCache(cacheKey, null, 60_000);
          return null;
        }

        const event = Array.from(events)[0];
        const projectInfo = JSON.parse(event.content) as ProjectInfo;
        
        if (useCache) {
          this.setCache(cacheKey, projectInfo);
        }
        
        return projectInfo;
      } catch (error) {
        return null;
      }
    });
  }

  async getProfileMetadata(nostrPubKey: string, useCache = true): Promise<ProjectProfileMetadata | null> {
    const cacheKey = this.getCacheKey('profile', nostrPubKey);
    
    if (useCache) {
      const cached = this.getFromCache<ProjectProfileMetadata>(cacheKey);
      if (cached) return cached;
    }

    return this.deduplicateRequest(cacheKey, async () => {
      try {
        await this.initialize();
        if (!this.isInitialized) return null;

        const filter: NDKFilter = {
          authors: [nostrPubKey],
          kinds: [0],
          limit: 1
        };

        const events = await this.ndk.fetchEvents(filter);
        
        if (events.size === 0) {
          this.setCache(cacheKey, null, 60_000);
          return null;
        }

        const event = Array.from(events)[0];
        const metadata = JSON.parse(event.content) as ProjectProfileMetadata;
        
        if (useCache) {
          this.setCache(cacheKey, metadata);
        }
        
        return metadata;
      } catch (error) {
        return null;
      }
    });
  }

  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = this.batchQueue.splice(0, this.BATCH_SIZE);
    const allEventIds = new Set<string>();
    const allPubKeys = new Set<string>();

    batch.forEach(req => {
      req.eventIds.forEach(id => allEventIds.add(id));
      req.pubKeys.forEach(key => allPubKeys.add(key));
    });

    try {
      await this.initialize();

      const [projectEvents, profileEvents] = await Promise.all([
        allEventIds.size > 0 ? this.ndk.fetchEvents({
          ids: Array.from(allEventIds),
          kinds: [3030 as any, 30078 as any]
        }) : new Set(),
        allPubKeys.size > 0 ? this.ndk.fetchEvents({
          authors: Array.from(allPubKeys),
          kinds: [0]
        }) : new Set()
      ]);

      const results = new Map<string, any>();

      for (const event of projectEvents) {
        try {
          const ndkEvent = event as NDKEvent;
          const projectInfo = JSON.parse(ndkEvent.content) as ProjectInfo;
          results.set(`project:${ndkEvent.id}`, projectInfo);
          this.setCache(this.getCacheKey('project', ndkEvent.id), projectInfo);
        } catch (error) {
        }
      }

      for (const event of profileEvents) {
        try {
          const ndkEvent = event as NDKEvent;
          const metadata = JSON.parse(ndkEvent.content) as ProjectProfileMetadata;
          results.set(`profile:${ndkEvent.pubkey}`, metadata);
          this.setCache(this.getCacheKey('profile', ndkEvent.pubkey), metadata);
        } catch (error) {
        }
      }

      batch.forEach(req => {
        try {
          req.resolver(results);
        } catch (error) {
          req.rejecter(error as Error);
        }
      });

    } catch (error) {
      batch.forEach(req => req.rejecter(error as Error));
    }
  }

  private scheduleBatch(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.batchTimeout = null;
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  async enrichProjectWithNostrData(project: any): Promise<any> {
    if (!project.nostrEventId) {
      return project;
    }

    const projectInfo = await this.getProjectInfo(project.nostrEventId);
    
    let metadata: ProjectProfileMetadata | null = null;
    if (projectInfo?.nostrPubKey) {
      metadata = await this.getProfileMetadata(projectInfo.nostrPubKey);
    }

    return {
      ...project,
      projectInfo,
      metadata
    };
  }

  async enrichProjectsWithNostrData(projects: any[]): Promise<any[]> {
    if (!Array.isArray(projects)) {
      return [];
    }
    
    if (projects.length === 0) return projects;

    if (!this.isInitialized) {
      await this.initialize();
      if (!this.isInitialized) {
        return projects;
      }
    }

    const eventIds = new Set<string>();
    const pubKeys = new Set<string>();

    projects.forEach(project => {
      if (project.nostrEventId) {
        eventIds.add(project.nostrEventId);
      }
    });

    const projectInfoMap = new Map<string, ProjectInfo>();
    if (eventIds.size > 0) {
      await Promise.all(
        Array.from(eventIds).map(async (eventId) => {
          try {
            const projectInfo = await this.getProjectInfo(eventId);
            if (projectInfo) {
              projectInfoMap.set(eventId, projectInfo);
              if (projectInfo.nostrPubKey) {
                pubKeys.add(projectInfo.nostrPubKey);
              }
            }
          } catch (error) {
          }
        })
      );
    }

    const metadataMap = new Map<string, ProjectProfileMetadata>();
    if (pubKeys.size > 0) {
      await Promise.all(
        Array.from(pubKeys).map(async (pubKey) => {
          try {
            const metadata = await this.getProfileMetadata(pubKey);
            if (metadata) {
              metadataMap.set(pubKey, metadata);
            }
          } catch (error) {
          }
        })
      );
    }

    const enrichedProjects = projects.map(project => {
      if (!project.nostrEventId) return project;

      const projectInfo = projectInfoMap.get(project.nostrEventId);
      const metadata = projectInfo?.nostrPubKey ? metadataMap.get(projectInfo.nostrPubKey) : null;

      return {
        ...project,
        projectInfo,
        metadata
      };
    });

    return enrichedProjects;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  disconnect(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    this.clearCache();
    this.pendingRequests.clear();
    this.batchQueue.length = 0;
    
    if (this.isInitialized) {
      this.isInitialized = false;
    }
  }
}
