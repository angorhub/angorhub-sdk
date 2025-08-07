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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AngorHubSDK = void 0;
var axios_1 = require("axios");
var nostr_service_1 = require("./nostr-service");
var AngorHubSDK = /** @class */ (function () {
    function AngorHubSDK(network, config) {
        if (network === void 0) { network = 'mainnet'; }
        if (config === void 0) { config = {}; }
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
        var defaultRelays = this.getDefaultNostrRelays(network);
        this.config = {
            timeout: config.timeout || 8000,
            useRemoteConfig: config.useRemoteConfig !== false,
            customIndexerUrl: config.customIndexerUrl || '',
            enableNostr: config.enableNostr !== false,
            nostrRelays: ((_a = config.nostrRelays) === null || _a === void 0 ? void 0 : _a.length) ? config.nostrRelays : defaultRelays,
            enableCache: config.enableCache !== false,
            cacheTtl: config.cacheTtl || 300000,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            healthCheckInterval: config.healthCheckInterval || 60000,
            enableCompression: config.enableCompression !== false,
            concurrentRequests: config.concurrentRequests || 10
        };
        this.initializeIndexers();
        this.initializeNostrService();
        this.startHealthChecks();
    }
    AngorHubSDK.prototype.getDefaultNostrRelays = function (network) {
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
        return [
            "wss://relay.damus.io",
            "wss://relay.angor.io"
        ];
    };
    AngorHubSDK.prototype.initializeIndexers = function () {
        if (this.config.customIndexerUrl) {
            this.indexers = [{ url: this.config.customIndexerUrl, isPrimary: true, priority: 1 }];
        }
        else {
            this.indexers = __spreadArray([], this.networks[this.network], true);
        }
        this.healthyIndexers = __spreadArray([], this.indexers, true);
        this.initializeAxiosInstances();
    };
    AngorHubSDK.prototype.initializeAxiosInstances = function () {
        var _this = this;
        this.indexers.forEach(function (indexer) {
            var axiosConfig = {
                baseURL: "".concat(indexer.url, "api/query/Angor/"),
                timeout: _this.config.timeout,
                maxRedirects: 3,
                validateStatus: function (status) { return status < 500; },
            };
            if (typeof window !== 'undefined') {
                axiosConfig.headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                };
            }
            else {
                axiosConfig.headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                };
                if (_this.config.enableCompression) {
                    axiosConfig.headers['Accept-Encoding'] = 'gzip, deflate, br';
                }
            }
            _this.axiosInstances.set(indexer.url, axios_1.default.create(axiosConfig));
        });
    };
    AngorHubSDK.prototype.initializeNostrService = function () {
        if (this.config.enableNostr) {
            this.nostrService = new nostr_service_1.NostrService(this.config.nostrRelays);
        }
    };
    AngorHubSDK.prototype.getCacheKey = function (endpoint, params) {
        if (params === void 0) { params = {}; }
        var sortedParams = Object.keys(params).sort().reduce(function (result, key) {
            result[key] = params[key];
            return result;
        }, {});
        return "".concat(this.network, ":").concat(endpoint, ":").concat(JSON.stringify(sortedParams));
    };
    AngorHubSDK.prototype.getFromCache = function (key) {
        if (!this.config.enableCache)
            return null;
        var entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.timestamp + entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    };
    AngorHubSDK.prototype.setCache = function (key, data, ttl) {
        if (ttl === void 0) { ttl = this.config.cacheTtl; }
        if (!this.config.enableCache)
            return;
        this.cache.set(key, {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        });
    };
    AngorHubSDK.prototype.checkIndexerHealth = function (indexer) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, health, axiosInstance, response, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        startTime = Date.now();
                        health = {
                            url: indexer.url,
                            isHealthy: false,
                            responseTime: 0,
                            lastCheck: Date.now(),
                            errorCount: ((_a = this.healthStatus.get(indexer.url)) === null || _a === void 0 ? void 0 : _a.errorCount) || 0
                        };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        axiosInstance = this.axiosInstances.get(indexer.url);
                        if (!axiosInstance)
                            throw new Error('No axios instance');
                        return [4 /*yield*/, axiosInstance.get('projects', {
                                params: { limit: 1 },
                                timeout: 5000
                            })];
                    case 2:
                        response = _b.sent();
                        health.responseTime = Date.now() - startTime;
                        health.isHealthy = response.status === 200;
                        health.errorCount = 0;
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _b.sent();
                        health.responseTime = Date.now() - startTime;
                        health.isHealthy = false;
                        health.errorCount++;
                        return [3 /*break*/, 4];
                    case 4:
                        this.healthStatus.set(indexer.url, health);
                        return [2 /*return*/, health];
                }
            });
        });
    };
    AngorHubSDK.prototype.updateHealthyIndexers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var healthChecks;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all(this.indexers.map(function (indexer) { return _this.checkIndexerHealth(indexer); }))];
                    case 1:
                        healthChecks = _a.sent();
                        this.healthyIndexers = this.indexers
                            .filter(function (indexer) {
                            var health = _this.healthStatus.get(indexer.url);
                            return (health === null || health === void 0 ? void 0 : health.isHealthy) && health.errorCount < 5;
                        })
                            .sort(function (a, b) {
                            var healthA = _this.healthStatus.get(a.url);
                            var healthB = _this.healthStatus.get(b.url);
                            if (a.priority !== b.priority) {
                                return a.priority - b.priority;
                            }
                            return ((healthA === null || healthA === void 0 ? void 0 : healthA.responseTime) || Infinity) - ((healthB === null || healthB === void 0 ? void 0 : healthB.responseTime) || Infinity);
                        });
                        if (this.healthyIndexers.length === 0) {
                            this.healthyIndexers = __spreadArray([], this.indexers, true);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    AngorHubSDK.prototype.startHealthChecks = function () {
        var _this = this;
        this.updateHealthyIndexers();
        this.healthCheckTimer = setInterval(function () {
            _this.updateHealthyIndexers();
        }, this.config.healthCheckInterval);
    };
    AngorHubSDK.prototype.throttleRequest = function (requestFn) {
        return __awaiter(this, void 0, void 0, function () {
            var result, nextRequest_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.activeRequests >= this.config.concurrentRequests) {
                            return [2 /*return*/, new Promise(function (resolve, reject) {
                                    _this.requestQueue.push(function () { return __awaiter(_this, void 0, void 0, function () {
                                        var result, error_2;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    _a.trys.push([0, 2, , 3]);
                                                    return [4 /*yield*/, requestFn()];
                                                case 1:
                                                    result = _a.sent();
                                                    resolve(result);
                                                    return [3 /*break*/, 3];
                                                case 2:
                                                    error_2 = _a.sent();
                                                    reject(error_2);
                                                    return [3 /*break*/, 3];
                                                case 3: return [2 /*return*/];
                                            }
                                        });
                                    }); });
                                })];
                        }
                        this.activeRequests++;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, requestFn()];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 3:
                        this.activeRequests--;
                        if (this.requestQueue.length > 0) {
                            nextRequest_1 = this.requestQueue.shift();
                            if (nextRequest_1) {
                                setImmediate(function () { return nextRequest_1(); });
                            }
                        }
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AngorHubSDK.prototype.makeRequestWithRetry = function (endpoint_1) {
        return __awaiter(this, arguments, void 0, function (endpoint, params, requestConfig) {
            var config, cacheKey, cached, requestPromise, result;
            var _this = this;
            if (params === void 0) { params = {}; }
            if (requestConfig === void 0) { requestConfig = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = __assign({ timeout: this.config.timeout, retries: this.config.maxRetries, retryDelay: this.config.retryDelay, useCache: this.config.enableCache, cacheTtl: this.config.cacheTtl }, requestConfig);
                        cacheKey = this.getCacheKey(endpoint, params);
                        if (config.useCache) {
                            cached = this.getFromCache(cacheKey);
                            if (cached !== null)
                                return [2 /*return*/, cached];
                        }
                        if (this.pendingRequests.has(cacheKey)) {
                            return [2 /*return*/, this.pendingRequests.get(cacheKey)];
                        }
                        requestPromise = this.throttleRequest(function () { return __awaiter(_this, void 0, void 0, function () {
                            var lastError, _loop_1, this_1, attempt, state_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        lastError = null;
                                        _loop_1 = function (attempt) {
                                            var healthyIndexers, _i, healthyIndexers_1, indexer, axiosInstance, response, error_3, health;
                                            return __generator(this, function (_b) {
                                                switch (_b.label) {
                                                    case 0:
                                                        healthyIndexers = this_1.healthyIndexers.length > 0 ? this_1.healthyIndexers : this_1.indexers;
                                                        _i = 0, healthyIndexers_1 = healthyIndexers;
                                                        _b.label = 1;
                                                    case 1:
                                                        if (!(_i < healthyIndexers_1.length)) return [3 /*break*/, 6];
                                                        indexer = healthyIndexers_1[_i];
                                                        _b.label = 2;
                                                    case 2:
                                                        _b.trys.push([2, 4, , 5]);
                                                        axiosInstance = this_1.axiosInstances.get(indexer.url);
                                                        if (!axiosInstance)
                                                            return [3 /*break*/, 5];
                                                        return [4 /*yield*/, axiosInstance.get(endpoint, {
                                                                params: params,
                                                                timeout: config.timeout
                                                            })];
                                                    case 3:
                                                        response = _b.sent();
                                                        if (config.useCache && response.status === 200) {
                                                            this_1.setCache(cacheKey, response.data, config.cacheTtl);
                                                        }
                                                        return [2 /*return*/, { value: response.data }];
                                                    case 4:
                                                        error_3 = _b.sent();
                                                        lastError = error_3;
                                                        health = this_1.healthStatus.get(indexer.url);
                                                        if (health) {
                                                            health.errorCount++;
                                                            health.isHealthy = false;
                                                        }
                                                        return [3 /*break*/, 5];
                                                    case 5:
                                                        _i++;
                                                        return [3 /*break*/, 1];
                                                    case 6:
                                                        if (!(attempt < config.retries)) return [3 /*break*/, 8];
                                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, config.retryDelay * (attempt + 1)); })];
                                                    case 7:
                                                        _b.sent();
                                                        _b.label = 8;
                                                    case 8: return [2 /*return*/];
                                                }
                                            });
                                        };
                                        this_1 = this;
                                        attempt = 0;
                                        _a.label = 1;
                                    case 1:
                                        if (!(attempt <= config.retries)) return [3 /*break*/, 4];
                                        return [5 /*yield**/, _loop_1(attempt)];
                                    case 2:
                                        state_1 = _a.sent();
                                        if (typeof state_1 === "object")
                                            return [2 /*return*/, state_1.value];
                                        _a.label = 3;
                                    case 3:
                                        attempt++;
                                        return [3 /*break*/, 1];
                                    case 4: throw lastError || new Error('All indexers failed');
                                }
                            });
                        }); });
                        this.pendingRequests.set(cacheKey, requestPromise);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, requestPromise];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 3:
                        this.pendingRequests.delete(cacheKey);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AngorHubSDK.prototype.getProjects = function () {
        return __awaiter(this, arguments, void 0, function (limit, offset, useCache) {
            var response, projects, error_4;
            var _a;
            if (limit === void 0) { limit = 10; }
            if (offset === void 0) { offset = 0; }
            if (useCache === void 0) { useCache = true; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.makeRequestWithRetry('projects', { limit: limit, offset: offset }, { useCache: useCache })];
                    case 1:
                        response = _b.sent();
                        projects = void 0;
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
                            throw new Error("API returned unexpected format. Expected array of projects, got: ".concat(typeof response));
                        }
                        if (!(this.nostrService && projects.length > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.nostrService.enrichProjectsWithNostrData(projects)];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3: return [2 /*return*/, projects];
                    case 4:
                        error_4 = _b.sent();
                        if (((_a = error_4.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                            throw new Error("Projects endpoint not found (404). This may indicate the ".concat(this.network, " indexer is not available or the API endpoint has changed."));
                        }
                        throw error_4;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    AngorHubSDK.prototype.getProject = function (projectId_1) {
        return __awaiter(this, arguments, void 0, function (projectId, useCache) {
            var project;
            if (useCache === void 0) { useCache = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.makeRequestWithRetry("projects/".concat(projectId), {}, { useCache: useCache })];
                    case 1:
                        project = _a.sent();
                        if (!this.nostrService) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.nostrService.enrichProjectWithNostrData(project)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [2 /*return*/, project];
                }
            });
        });
    };
    AngorHubSDK.prototype.getProjectStats = function (projectId_1) {
        return __awaiter(this, arguments, void 0, function (projectId, useCache) {
            if (useCache === void 0) { useCache = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.makeRequestWithRetry("projects/".concat(projectId, "/stats"), {}, { useCache: useCache, cacheTtl: 60000 })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AngorHubSDK.prototype.getProjectInvestments = function (projectId_1) {
        return __awaiter(this, arguments, void 0, function (projectId, limit, offset, useCache) {
            if (limit === void 0) { limit = 10; }
            if (offset === void 0) { offset = 0; }
            if (useCache === void 0) { useCache = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.makeRequestWithRetry("projects/".concat(projectId, "/investments"), { limit: limit, offset: offset }, { useCache: useCache })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AngorHubSDK.prototype.getInvestorInvestment = function (projectId_1, investorPublicKey_1) {
        return __awaiter(this, arguments, void 0, function (projectId, investorPublicKey, useCache) {
            if (useCache === void 0) { useCache = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.makeRequestWithRetry("projects/".concat(projectId, "/investments/").concat(investorPublicKey), {}, { useCache: useCache })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AngorHubSDK.prototype.getMultipleProjects = function (projectIds_1) {
        return __awaiter(this, arguments, void 0, function (projectIds, useCache) {
            var requests;
            var _this = this;
            if (useCache === void 0) { useCache = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        requests = projectIds.map(function (id) { return _this.getProject(id, useCache); });
                        return [4 /*yield*/, Promise.all(requests)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AngorHubSDK.prototype.getMultipleProjectStats = function (projectIds_1) {
        return __awaiter(this, arguments, void 0, function (projectIds, useCache) {
            var requests;
            var _this = this;
            if (useCache === void 0) { useCache = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        requests = projectIds.map(function (id) { return _this.getProjectStats(id, useCache); });
                        return [4 /*yield*/, Promise.all(requests)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AngorHubSDK.prototype.clearCache = function () {
        this.cache.clear();
        if (this.nostrService) {
            this.nostrService.clearCache();
        }
    };
    AngorHubSDK.prototype.getCacheStats = function () {
        var stats = {
            sdkCache: {
                size: this.cache.size,
                keys: Array.from(this.cache.keys())
            }
        };
        if (this.nostrService) {
            return __assign(__assign({}, stats), { nostrCache: this.nostrService.getCacheStats() });
        }
        return stats;
    };
    AngorHubSDK.prototype.getHealthStatus = function () {
        return {
            indexers: Array.from(this.healthStatus.values()),
            healthyCount: this.healthyIndexers.length
        };
    };
    AngorHubSDK.prototype.getConfigInfo = function () {
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
    };
    AngorHubSDK.prototype.destroy = function () {
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
    };
    return AngorHubSDK;
}());
exports.AngorHubSDK = AngorHubSDK;
