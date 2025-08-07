"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NostrService = void 0;
const ndk_1 = __importDefault(require("@nostr-dev-kit/ndk"));
class NostrService {
    constructor(relays = [
        "wss://relay.damus.io",
        "wss://relay.primal.net",
        "wss://nos.lol",
        "wss://relay.angor.io",
        "wss://relay2.angor.io"
    ]) {
        this.isInitialized = false;
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.batchQueue = [];
        this.batchTimeout = null;
        this.BATCH_DELAY = 50;
        this.BATCH_SIZE = 20;
        this.DEFAULT_CACHE_TTL = 300000;
        try {
            this.ndk = new ndk_1.default({
                explicitRelayUrls: relays,
                enableOutboxModel: false
            });
        }
        catch (error) {
            this.ndk = new ndk_1.default({
                explicitRelayUrls: relays.slice(0, 2)
            });
        }
    }
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            await this.ndk.connect();
            this.isInitialized = true;
        }
        catch (error) {
            this.isInitialized = false;
        }
    }
    getCacheKey(type, id) {
        return `${type}:${id}`;
    }
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.timestamp + entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    setCache(key, data, ttl = this.DEFAULT_CACHE_TTL) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }
    async deduplicateRequest(key, requestFn) {
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }
        const promise = requestFn().finally(() => {
            this.pendingRequests.delete(key);
        });
        this.pendingRequests.set(key, promise);
        return promise;
    }
    async getProjectInfo(nostrEventId, useCache = true) {
        const cacheKey = this.getCacheKey('project', nostrEventId);
        if (useCache) {
            const cached = this.getFromCache(cacheKey);
            if (cached)
                return cached;
        }
        return this.deduplicateRequest(cacheKey, async () => {
            try {
                await this.initialize();
                if (!this.isInitialized)
                    return null;
                const filter = {
                    ids: [nostrEventId],
                    kinds: [3030, 30078],
                    limit: 1
                };
                const events = await this.ndk.fetchEvents(filter);
                if (events.size === 0) {
                    this.setCache(cacheKey, null, 60000);
                    return null;
                }
                const event = Array.from(events)[0];
                const projectInfo = JSON.parse(event.content);
                if (useCache) {
                    this.setCache(cacheKey, projectInfo);
                }
                return projectInfo;
            }
            catch (error) {
                return null;
            }
        });
    }
    async getProfileMetadata(nostrPubKey, useCache = true) {
        const cacheKey = this.getCacheKey('profile', nostrPubKey);
        if (useCache) {
            const cached = this.getFromCache(cacheKey);
            if (cached)
                return cached;
        }
        return this.deduplicateRequest(cacheKey, async () => {
            try {
                await this.initialize();
                if (!this.isInitialized)
                    return null;
                const filter = {
                    authors: [nostrPubKey],
                    kinds: [0],
                    limit: 1
                };
                const events = await this.ndk.fetchEvents(filter);
                if (events.size === 0) {
                    this.setCache(cacheKey, null, 60000);
                    return null;
                }
                const event = Array.from(events)[0];
                const metadata = JSON.parse(event.content);
                if (useCache) {
                    this.setCache(cacheKey, metadata);
                }
                return metadata;
            }
            catch (error) {
                return null;
            }
        });
    }
    async processBatch() {
        if (this.batchQueue.length === 0)
            return;
        const batch = this.batchQueue.splice(0, this.BATCH_SIZE);
        const allEventIds = new Set();
        const allPubKeys = new Set();
        batch.forEach(req => {
            req.eventIds.forEach(id => allEventIds.add(id));
            req.pubKeys.forEach(key => allPubKeys.add(key));
        });
        try {
            await this.initialize();
            const [projectEvents, profileEvents] = await Promise.all([
                allEventIds.size > 0 ? this.ndk.fetchEvents({
                    ids: Array.from(allEventIds),
                    kinds: [3030, 30078]
                }) : new Set(),
                allPubKeys.size > 0 ? this.ndk.fetchEvents({
                    authors: Array.from(allPubKeys),
                    kinds: [0]
                }) : new Set()
            ]);
            const results = new Map();
            for (const event of projectEvents) {
                try {
                    const ndkEvent = event;
                    const projectInfo = JSON.parse(ndkEvent.content);
                    results.set(`project:${ndkEvent.id}`, projectInfo);
                    this.setCache(this.getCacheKey('project', ndkEvent.id), projectInfo);
                }
                catch (error) {
                }
            }
            for (const event of profileEvents) {
                try {
                    const ndkEvent = event;
                    const metadata = JSON.parse(ndkEvent.content);
                    results.set(`profile:${ndkEvent.pubkey}`, metadata);
                    this.setCache(this.getCacheKey('profile', ndkEvent.pubkey), metadata);
                }
                catch (error) {
                }
            }
            batch.forEach(req => {
                try {
                    req.resolver(results);
                }
                catch (error) {
                    req.rejecter(error);
                }
            });
        }
        catch (error) {
            batch.forEach(req => req.rejecter(error));
        }
    }
    scheduleBatch() {
        if (this.batchTimeout)
            return;
        this.batchTimeout = setTimeout(() => {
            this.batchTimeout = null;
            this.processBatch();
        }, this.BATCH_DELAY);
    }
    async enrichProjectWithNostrData(project) {
        if (!project.nostrEventId) {
            return project;
        }
        const projectInfo = await this.getProjectInfo(project.nostrEventId);
        let metadata = null;
        if (projectInfo === null || projectInfo === void 0 ? void 0 : projectInfo.nostrPubKey) {
            metadata = await this.getProfileMetadata(projectInfo.nostrPubKey);
        }
        return {
            ...project,
            projectInfo,
            metadata
        };
    }
    async enrichProjectsWithNostrData(projects) {
        if (!Array.isArray(projects)) {
            return [];
        }
        if (projects.length === 0)
            return projects;
        if (!this.isInitialized) {
            await this.initialize();
            if (!this.isInitialized) {
                return projects;
            }
        }
        const eventIds = new Set();
        const pubKeys = new Set();
        projects.forEach(project => {
            if (project.nostrEventId) {
                eventIds.add(project.nostrEventId);
            }
        });
        const projectInfoMap = new Map();
        if (eventIds.size > 0) {
            await Promise.all(Array.from(eventIds).map(async (eventId) => {
                try {
                    const projectInfo = await this.getProjectInfo(eventId);
                    if (projectInfo) {
                        projectInfoMap.set(eventId, projectInfo);
                        if (projectInfo.nostrPubKey) {
                            pubKeys.add(projectInfo.nostrPubKey);
                        }
                    }
                }
                catch (error) {
                }
            }));
        }
        const metadataMap = new Map();
        if (pubKeys.size > 0) {
            await Promise.all(Array.from(pubKeys).map(async (pubKey) => {
                try {
                    const metadata = await this.getProfileMetadata(pubKey);
                    if (metadata) {
                        metadataMap.set(pubKey, metadata);
                    }
                }
                catch (error) {
                }
            }));
        }
        const enrichedProjects = projects.map(project => {
            if (!project.nostrEventId)
                return project;
            const projectInfo = projectInfoMap.get(project.nostrEventId);
            const metadata = (projectInfo === null || projectInfo === void 0 ? void 0 : projectInfo.nostrPubKey) ? metadataMap.get(projectInfo.nostrPubKey) : null;
            return {
                ...project,
                projectInfo,
                metadata
            };
        });
        return enrichedProjects;
    }
    clearCache() {
        this.cache.clear();
    }
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
    disconnect() {
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
exports.NostrService = NostrService;
//# sourceMappingURL=nostr-service.js.map