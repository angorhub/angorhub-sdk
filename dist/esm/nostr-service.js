import NDK from './node_modules/@nostr-dev-kit/ndk/dist/index.js';

class NostrService {
    constructor(relays = [
        "wss://relay.damus.io",
        "wss://relay.primal.net",
        "wss://nos.lol",
        "wss://relay.angor.io",
        "wss://relay2.angor.io"
    ]) {
        this.isInitialized = false;
        this.ndk = new NDK({
            explicitRelayUrls: relays,
        });
    }
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            await this.ndk.connect();
            this.isInitialized = true;
        }
        catch (error) {
            console.error('Failed to initialize Nostr service:', error);
            throw error;
        }
    }
    async getProjectInfo(nostrEventId) {
        try {
            await this.initialize();
            // Fetch project info events (kinds 3030, 30078)
            const filter = {
                ids: [nostrEventId],
                kinds: [3030, 30078],
                limit: 1
            };
            const events = await this.ndk.fetchEvents(filter);
            if (events.size === 0) {
                console.warn(`No project info found for event ID: ${nostrEventId}`);
                return null;
            }
            const event = Array.from(events)[0];
            try {
                const projectInfo = JSON.parse(event.content);
                return projectInfo;
            }
            catch (parseError) {
                console.error('Failed to parse project info:', parseError);
                return null;
            }
        }
        catch (error) {
            console.error('Error fetching project info:', error);
            return null;
        }
    }
    async getProfileMetadata(nostrPubKey) {
        try {
            await this.initialize();
            // Fetch user profile metadata (kind 0)
            const filter = {
                authors: [nostrPubKey],
                kinds: [0],
                limit: 1
            };
            const events = await this.ndk.fetchEvents(filter);
            if (events.size === 0) {
                console.warn(`No profile metadata found for pubkey: ${nostrPubKey}`);
                return null;
            }
            const event = Array.from(events)[0];
            try {
                const metadata = JSON.parse(event.content);
                return metadata;
            }
            catch (parseError) {
                console.error('Failed to parse profile metadata:', parseError);
                return null;
            }
        }
        catch (error) {
            console.error('Error fetching profile metadata:', error);
            return null;
        }
    }
    async enrichProjectWithNostrData(project) {
        if (!project.nostrEventId) {
            return project;
        }
        // Get project info from Nostr
        const projectInfo = await this.getProjectInfo(project.nostrEventId);
        let metadata = null;
        // If we have project info and nostrPubKey, get profile metadata
        if (projectInfo && projectInfo.nostrPubKey) {
            metadata = await this.getProfileMetadata(projectInfo.nostrPubKey);
        }
        return {
            ...project,
            projectInfo,
            metadata
        };
    }
    async enrichProjectsWithNostrData(projects) {
        const enrichedProjects = await Promise.all(projects.map(project => this.enrichProjectWithNostrData(project)));
        return enrichedProjects;
    }
    disconnect() {
        if (this.isInitialized) {
            // NDK doesn't have explicit disconnect, but we can clean up
            this.isInitialized = false;
        }
    }
}

export { NostrService };
//# sourceMappingURL=nostr-service.js.map
