import axios from 'axios';
export class AngorHubSDK {
    constructor(network = 'mainnet', config = {}) {
        this.networks = {
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
        this.network = network;
        this.config = {
            timeout: config.timeout || 8000,
            useRemoteConfig: config.useRemoteConfig !== false,
            customIndexerUrl: config.customIndexerUrl,
        };
        if (this.config.customIndexerUrl) {
            this.indexers = [{ url: this.config.customIndexerUrl, isPrimary: true }];
        }
        else {
            this.indexers = this.networks[network];
        }
        this.currentIndexer = this.indexers.find(i => i.isPrimary) || this.indexers[0];
    }
    async makeRequest(endpoint, params = {}) {
        for (const indexer of this.indexers) {
            try {
                const response = await axios.get(`${indexer.url}api/query/Angor/${endpoint}`, {
                    params,
                    timeout: this.config.timeout
                });
                this.currentIndexer = indexer;
                return response.data;
            }
            catch (_) { }
        }
        throw new Error('All indexers failed');
    }
    async getProjects(limit = 10, offset = 0) {
        return await this.makeRequest('projects', { limit, offset });
    }
    async getProject(projectId) {
        return await this.makeRequest(`projects/${projectId}`);
    }
    async getProjectStats(projectId) {
        return await this.makeRequest(`projects/${projectId}/stats`);
    }
    async getProjectInvestments(projectId, limit = 10, offset = 0) {
        return await this.makeRequest(`projects/${projectId}/investments`, { limit, offset });
    }
    async getInvestorInvestment(projectId, investorPublicKey) {
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
//# sourceMappingURL=sdk.js.map