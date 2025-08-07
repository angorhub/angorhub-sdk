# Remote Configuration Service

The AngorHub SDK now supports fetching indexer and relay configurations from a remote service, providing centralized configuration management and easy updates without requiring code changes.

## Features

- 🔄 **Automatic Configuration Fetching**: Automatically fetch the latest indexer and relay lists
- 🌐 **Network-Specific Configs**: Separate configurations for mainnet and testnet
- 🔧 **Fallback Support**: Falls back to default configurations if remote service is unavailable
- ⚡ **Load Balancing**: Primary/secondary indexer support for better reliability
- 🔄 **Runtime Refresh**: Refresh configuration without restarting your application

## Configuration Service URLs

The SDK fetches configuration from the following endpoints:

- **Relays**: `https://angorhub.github.io/lists/relays.json`
- **Indexers**: `https://angorhub.github.io/lists/indexers.json`

## Usage

### Basic Usage with Remote Configuration

```typescript
import { AngorHubSDK } from 'angorhub-sdk';

// Remote configuration is enabled by default
const sdk = new AngorHubSDK('mainnet', {
  useRemoteConfig: true, // Default: true
  configServiceUrl: 'https://angorhub.github.io/lists', // Default URL
  enableNostr: true
});

// The SDK will automatically fetch the latest configurations
const projects = await sdk.getProjects(10);
```

### Disabling Remote Configuration

```typescript
// Use only default/local configurations
const sdk = new AngorHubSDK('mainnet', {
  useRemoteConfig: false,
  enableNostr: true,
  nostrRelays: [
    "wss://relay.damus.io",
    "wss://relay.primal.net"
  ]
});
```

### Custom Configuration Service

```typescript
// Use your own configuration service
const sdk = new AngorHubSDK('mainnet', {
  useRemoteConfig: true,
  configServiceUrl: 'https://your-config-service.com/api',
  enableNostr: true
});
```

### Runtime Configuration Refresh

```typescript
// Manually refresh configuration without restarting
await sdk.refreshConfiguration();

// Check current configuration
const config = sdk.getConfigInfo();
console.log('Current configuration:', config);
```

## Configuration Format

### Relay Configuration

```json
{
  "mainnet": [
    "wss://relay.damus.io",
    "wss://relay.primal.net",
    "wss://nos.lol",
    "wss://relay.angor.io",
    "wss://relay2.angor.io"
  ],
  "testnet": [
    "wss://relay.damus.io",
    "wss://relay.primal.net", 
    "wss://nos.lol",
    "wss://relay.angor.io",
    "wss://relay2.angor.io"
  ]
}
```

### Indexer Configuration

```json
{
  "mainnet": [
    { "url": "https://indexer.angor.io/", "isPrimary": false },
    { "url": "https://fulcrum.angor.online/", "isPrimary": true },
    { "url": "https://electrs.angor.online/", "isPrimary": false }
  ],
  "testnet": [
    { "url": "https://test.indexer.angor.io/", "isPrimary": true },
    { "url": "https://signet.angor.online/", "isPrimary": false }
  ]
}
```

## TypeScript Interfaces

```typescript
interface RelayConfig {
  mainnet: string[];
  testnet: string[];
}

interface IndexerService {
  url: string;
  isPrimary: boolean;
}

interface IndexerConfig {
  mainnet: IndexerService[];
  testnet: IndexerService[];
}

interface SDKConfig {
  // ... other options
  useRemoteConfig?: boolean;
  configServiceUrl?: string;
}
```

## Error Handling

The SDK gracefully handles configuration service failures:

1. **Network Errors**: Falls back to default configurations
2. **Invalid JSON**: Falls back to default configurations  
3. **Missing Properties**: Uses default values for missing fields
4. **Service Unavailable**: Continues with last known good configuration

## Benefits

### For Developers
- No need to hardcode indexer URLs
- Automatic updates when new relays/indexers are added
- Better error handling with automatic failover
- Consistent configuration across all applications

### For Infrastructure
- Centralized configuration management
- Easy load balancing and maintenance
- Rapid deployment of new services
- Network-wide configuration updates

## Migration Guide

### From Default Configuration

**Before:**
```typescript
const sdk = new AngorHubSDK('mainnet', {
  nostrRelays: [
    "wss://relay.damus.io",
    "wss://relay.primal.net"
  ]
});
```

**After:**
```typescript
// Remote configuration automatically provides the latest relays
const sdk = new AngorHubSDK('mainnet', {
  useRemoteConfig: true // This is the default
});
```

### Custom Indexer URLs

**Before:**
```typescript
const sdk = new AngorHubSDK('mainnet', {
  customIndexerUrl: 'https://my-indexer.com/'
});
```

**After:**
```typescript
// Still supported for custom deployments
const sdk = new AngorHubSDK('mainnet', {
  customIndexerUrl: 'https://my-indexer.com/',
  useRemoteConfig: false // Disable remote config when using custom indexer
});
```

## Examples

See the complete examples in:
- `examples/remote-config-example.js` - Node.js example
- `examples/browser.html` - Browser example with configuration UI

## Configuration Service Implementation

If you want to host your own configuration service, ensure your endpoints return JSON in the expected format and enable CORS for browser usage.

Example Express.js endpoint:
```javascript
app.get('/relays.json', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({
    mainnet: ["wss://relay1.com", "wss://relay2.com"],
    testnet: ["wss://test-relay1.com", "wss://test-relay2.com"]
  });
});
```
