import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import type { ProjectInfo, ProjectProfileMetadata } from './interfaces';

export class NostrService {
  private ndk: NDK;
  private isInitialized: boolean = false;

  constructor(relays: string[] = [
    "wss://relay.damus.io",
    "wss://relay.primal.net",
    "wss://nos.lol",
    "wss://relay.angor.io",
    "wss://relay2.angor.io"
  ]) {
    this.ndk = new NDK({
      explicitRelayUrls: relays,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.ndk.connect();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Nostr service:', error);
      throw error;
    }
  }

  async getProjectInfo(nostrEventId: string): Promise<ProjectInfo | null> {
    try {
      await this.initialize();

      // Fetch project info events (kinds 3030, 30078)
      const filter: NDKFilter = {
        ids: [nostrEventId],
        kinds: [3030 as any, 30078 as any],
        limit: 1
      };

      const events = await this.ndk.fetchEvents(filter);
      
      if (events.size === 0) {
        console.warn(`No project info found for event ID: ${nostrEventId}`);
        return null;
      }

      const event = Array.from(events)[0];
      
      try {
        const projectInfo = JSON.parse(event.content) as ProjectInfo;
        return projectInfo;
      } catch (parseError) {
        console.error('Failed to parse project info:', parseError);
        return null;
      }
    } catch (error) {
      console.error('Error fetching project info:', error);
      return null;
    }
  }

  async getProfileMetadata(nostrPubKey: string): Promise<ProjectProfileMetadata | null> {
    try {
      await this.initialize();

      // Fetch user profile metadata (kind 0)
      const filter: NDKFilter = {
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
        const metadata = JSON.parse(event.content) as ProjectProfileMetadata;
        return metadata;
      } catch (parseError) {
        console.error('Failed to parse profile metadata:', parseError);
        return null;
      }
    } catch (error) {
      console.error('Error fetching profile metadata:', error);
      return null;
    }
  }

  async enrichProjectWithNostrData(project: any): Promise<any> {
    if (!project.nostrEventId) {
      return project;
    }

    // Get project info from Nostr
    const projectInfo = await this.getProjectInfo(project.nostrEventId);
    
    let metadata: ProjectProfileMetadata | null = null;
    
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

  async enrichProjectsWithNostrData(projects: any[]): Promise<any[]> {
    const enrichedProjects = await Promise.all(
      projects.map(project => this.enrichProjectWithNostrData(project))
    );
    
    return enrichedProjects;
  }

  disconnect(): void {
    if (this.isInitialized) {
      // NDK doesn't have explicit disconnect, but we can clean up
      this.isInitialized = false;
    }
  }
}
