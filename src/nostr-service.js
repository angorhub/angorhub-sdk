"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NostrService = void 0;
var ndk_1 = require("@nostr-dev-kit/ndk");
var NostrService = /** @class */ (function () {
    function NostrService(relays) {
        if (relays === void 0) { relays = [
            "wss://relay.damus.io",
            "wss://relay.primal.net",
            "wss://nos.lol",
            "wss://relay.angor.io",
            "wss://relay2.angor.io"
        ]; }
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
    NostrService.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isInitialized)
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.ndk.connect()];
                    case 2:
                        _a.sent();
                        this.isInitialized = true;
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        this.isInitialized = false;
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    NostrService.prototype.getCacheKey = function (type, id) {
        return "".concat(type, ":").concat(id);
    };
    NostrService.prototype.getFromCache = function (key) {
        var entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.timestamp + entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    };
    NostrService.prototype.setCache = function (key, data, ttl) {
        if (ttl === void 0) { ttl = this.DEFAULT_CACHE_TTL; }
        this.cache.set(key, {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        });
    };
    NostrService.prototype.deduplicateRequest = function (key, requestFn) {
        return __awaiter(this, void 0, void 0, function () {
            var promise;
            var _this = this;
            return __generator(this, function (_a) {
                if (this.pendingRequests.has(key)) {
                    return [2 /*return*/, this.pendingRequests.get(key)];
                }
                promise = requestFn().finally(function () {
                    _this.pendingRequests.delete(key);
                });
                this.pendingRequests.set(key, promise);
                return [2 /*return*/, promise];
            });
        });
    };
    NostrService.prototype.getProjectInfo = function (nostrEventId_1) {
        return __awaiter(this, arguments, void 0, function (nostrEventId, useCache) {
            var cacheKey, cached;
            var _this = this;
            if (useCache === void 0) { useCache = true; }
            return __generator(this, function (_a) {
                cacheKey = this.getCacheKey('project', nostrEventId);
                if (useCache) {
                    cached = this.getFromCache(cacheKey);
                    if (cached)
                        return [2 /*return*/, cached];
                }
                return [2 /*return*/, this.deduplicateRequest(cacheKey, function () { return __awaiter(_this, void 0, void 0, function () {
                        var filter, events, event_1, projectInfo, error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    return [4 /*yield*/, this.initialize()];
                                case 1:
                                    _a.sent();
                                    if (!this.isInitialized)
                                        return [2 /*return*/, null];
                                    filter = {
                                        ids: [nostrEventId],
                                        kinds: [3030, 30078],
                                        limit: 1
                                    };
                                    return [4 /*yield*/, this.ndk.fetchEvents(filter)];
                                case 2:
                                    events = _a.sent();
                                    if (events.size === 0) {
                                        this.setCache(cacheKey, null, 60000);
                                        return [2 /*return*/, null];
                                    }
                                    event_1 = Array.from(events)[0];
                                    projectInfo = JSON.parse(event_1.content);
                                    if (useCache) {
                                        this.setCache(cacheKey, projectInfo);
                                    }
                                    return [2 /*return*/, projectInfo];
                                case 3:
                                    error_2 = _a.sent();
                                    return [2 /*return*/, null];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    NostrService.prototype.getProfileMetadata = function (nostrPubKey_1) {
        return __awaiter(this, arguments, void 0, function (nostrPubKey, useCache) {
            var cacheKey, cached;
            var _this = this;
            if (useCache === void 0) { useCache = true; }
            return __generator(this, function (_a) {
                cacheKey = this.getCacheKey('profile', nostrPubKey);
                if (useCache) {
                    cached = this.getFromCache(cacheKey);
                    if (cached)
                        return [2 /*return*/, cached];
                }
                return [2 /*return*/, this.deduplicateRequest(cacheKey, function () { return __awaiter(_this, void 0, void 0, function () {
                        var filter, events, event_2, metadata, error_3;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    return [4 /*yield*/, this.initialize()];
                                case 1:
                                    _a.sent();
                                    if (!this.isInitialized)
                                        return [2 /*return*/, null];
                                    filter = {
                                        authors: [nostrPubKey],
                                        kinds: [0],
                                        limit: 1
                                    };
                                    return [4 /*yield*/, this.ndk.fetchEvents(filter)];
                                case 2:
                                    events = _a.sent();
                                    if (events.size === 0) {
                                        this.setCache(cacheKey, null, 60000);
                                        return [2 /*return*/, null];
                                    }
                                    event_2 = Array.from(events)[0];
                                    metadata = JSON.parse(event_2.content);
                                    if (useCache) {
                                        this.setCache(cacheKey, metadata);
                                    }
                                    return [2 /*return*/, metadata];
                                case 3:
                                    error_3 = _a.sent();
                                    return [2 /*return*/, null];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    NostrService.prototype.processBatch = function () {
        return __awaiter(this, void 0, void 0, function () {
            var batch, allEventIds, allPubKeys, _a, projectEvents, profileEvents, results_1, _i, projectEvents_1, event_3, ndkEvent, projectInfo, _b, profileEvents_1, event_4, ndkEvent, metadata, error_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (this.batchQueue.length === 0)
                            return [2 /*return*/];
                        batch = this.batchQueue.splice(0, this.BATCH_SIZE);
                        allEventIds = new Set();
                        allPubKeys = new Set();
                        batch.forEach(function (req) {
                            req.eventIds.forEach(function (id) { return allEventIds.add(id); });
                            req.pubKeys.forEach(function (key) { return allPubKeys.add(key); });
                        });
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.initialize()];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, Promise.all([
                                allEventIds.size > 0 ? this.ndk.fetchEvents({
                                    ids: Array.from(allEventIds),
                                    kinds: [3030, 30078]
                                }) : new Set(),
                                allPubKeys.size > 0 ? this.ndk.fetchEvents({
                                    authors: Array.from(allPubKeys),
                                    kinds: [0]
                                }) : new Set()
                            ])];
                    case 3:
                        _a = _c.sent(), projectEvents = _a[0], profileEvents = _a[1];
                        results_1 = new Map();
                        for (_i = 0, projectEvents_1 = projectEvents; _i < projectEvents_1.length; _i++) {
                            event_3 = projectEvents_1[_i];
                            try {
                                ndkEvent = event_3;
                                projectInfo = JSON.parse(ndkEvent.content);
                                results_1.set("project:".concat(ndkEvent.id), projectInfo);
                                this.setCache(this.getCacheKey('project', ndkEvent.id), projectInfo);
                            }
                            catch (error) {
                            }
                        }
                        for (_b = 0, profileEvents_1 = profileEvents; _b < profileEvents_1.length; _b++) {
                            event_4 = profileEvents_1[_b];
                            try {
                                ndkEvent = event_4;
                                metadata = JSON.parse(ndkEvent.content);
                                results_1.set("profile:".concat(ndkEvent.pubkey), metadata);
                                this.setCache(this.getCacheKey('profile', ndkEvent.pubkey), metadata);
                            }
                            catch (error) {
                            }
                        }
                        batch.forEach(function (req) {
                            try {
                                req.resolver(results_1);
                            }
                            catch (error) {
                                req.rejecter(error);
                            }
                        });
                        return [3 /*break*/, 5];
                    case 4:
                        error_4 = _c.sent();
                        batch.forEach(function (req) { return req.rejecter(error_4); });
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    NostrService.prototype.scheduleBatch = function () {
        var _this = this;
        if (this.batchTimeout)
            return;
        this.batchTimeout = setTimeout(function () {
            _this.batchTimeout = null;
            _this.processBatch();
        }, this.BATCH_DELAY);
    };
    NostrService.prototype.enrichProjectWithNostrData = function (project) {
        return __awaiter(this, void 0, void 0, function () {
            var projectInfo, metadata;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!project.nostrEventId) {
                            return [2 /*return*/, project];
                        }
                        return [4 /*yield*/, this.getProjectInfo(project.nostrEventId)];
                    case 1:
                        projectInfo = _a.sent();
                        metadata = null;
                        if (!(projectInfo === null || projectInfo === void 0 ? void 0 : projectInfo.nostrPubKey)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.getProfileMetadata(projectInfo.nostrPubKey)];
                    case 2:
                        metadata = _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, __assign(__assign({}, project), { projectInfo: projectInfo, metadata: metadata })];
                }
            });
        });
    };
    NostrService.prototype.enrichProjectsWithNostrData = function (projects) {
        return __awaiter(this, void 0, void 0, function () {
            var eventIds, pubKeys, projectInfoMap, metadataMap, enrichedProjects;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!Array.isArray(projects)) {
                            return [2 /*return*/, []];
                        }
                        if (projects.length === 0)
                            return [2 /*return*/, projects];
                        if (!!this.isInitialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        if (!this.isInitialized) {
                            return [2 /*return*/, projects];
                        }
                        _a.label = 2;
                    case 2:
                        eventIds = new Set();
                        pubKeys = new Set();
                        projects.forEach(function (project) {
                            if (project.nostrEventId) {
                                eventIds.add(project.nostrEventId);
                            }
                        });
                        projectInfoMap = new Map();
                        if (!(eventIds.size > 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, Promise.all(Array.from(eventIds).map(function (eventId) { return __awaiter(_this, void 0, void 0, function () {
                                var projectInfo, error_5;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, this.getProjectInfo(eventId)];
                                        case 1:
                                            projectInfo = _a.sent();
                                            if (projectInfo) {
                                                projectInfoMap.set(eventId, projectInfo);
                                                if (projectInfo.nostrPubKey) {
                                                    pubKeys.add(projectInfo.nostrPubKey);
                                                }
                                            }
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_5 = _a.sent();
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        metadataMap = new Map();
                        if (!(pubKeys.size > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, Promise.all(Array.from(pubKeys).map(function (pubKey) { return __awaiter(_this, void 0, void 0, function () {
                                var metadata, error_6;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, this.getProfileMetadata(pubKey)];
                                        case 1:
                                            metadata = _a.sent();
                                            if (metadata) {
                                                metadataMap.set(pubKey, metadata);
                                            }
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_6 = _a.sent();
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        enrichedProjects = projects.map(function (project) {
                            if (!project.nostrEventId)
                                return project;
                            var projectInfo = projectInfoMap.get(project.nostrEventId);
                            var metadata = (projectInfo === null || projectInfo === void 0 ? void 0 : projectInfo.nostrPubKey) ? metadataMap.get(projectInfo.nostrPubKey) : null;
                            return __assign(__assign({}, project), { projectInfo: projectInfo, metadata: metadata });
                        });
                        return [2 /*return*/, enrichedProjects];
                }
            });
        });
    };
    NostrService.prototype.clearCache = function () {
        this.cache.clear();
    };
    NostrService.prototype.getCacheStats = function () {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    };
    NostrService.prototype.disconnect = function () {
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
    };
    return NostrService;
}());
exports.NostrService = NostrService;
