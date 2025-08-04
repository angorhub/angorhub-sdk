export interface AngorProject {
    founderKey: string;
    projectIdentifier: string;
    createdOnBlock: number;
    trxId: string;
    nostrEventId: string;
    projectInfo?: ProjectInfo;
    metadata?: NostrProfileMetadata;
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
    stages: [{
        amountToRelease: number;
        releaseDate: number;
    }];
    projectSeeders: {
        threshold: number;
        secretHashes: string[];
    }[];
}
export interface NostrProfileMetadata {
    name?: string;
    about?: string;
    picture?: string;
    website?: string;
    nip05?: string;
    lud16?: string;
    display_name?: string;
    banner?: string;
}
export interface ProjectUpdate {
    founderKey: string;
    founderRecoveryKey: string;
    projectIdentifier: string;
    nostrPubKey: string;
    startDate: number;
    endDate: number;
    penaltyDays: number;
    expiryDate: number;
    targetAmount: number;
    stages: [{
        amountToRelease: number;
        releaseDate: number;
    }];
    projectSeeders: {
        threshold: number;
        secretHashes: string[];
    }[];
}
