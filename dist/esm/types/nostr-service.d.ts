import type { ProjectInfo, NostrProfileMetadata } from './interfaces';
export declare class NostrService {
    private ndk;
    private isInitialized;
    constructor(relays?: string[]);
    initialize(): Promise<void>;
    getProjectInfo(nostrEventId: string): Promise<ProjectInfo | null>;
    getProfileMetadata(nostrPubKey: string): Promise<NostrProfileMetadata | null>;
    enrichProjectWithNostrData(project: any): Promise<any>;
    enrichProjectsWithNostrData(projects: any[]): Promise<any[]>;
    disconnect(): void;
}
