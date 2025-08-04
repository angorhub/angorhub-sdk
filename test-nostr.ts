import { AngorHubSDK } from './src/sdk';

async function testSDK() {
  // Test without Nostr (disabled)
  console.log('=== Testing SDK without Nostr ===');
  const sdkWithoutNostr = new AngorHubSDK('mainnet', { enableNostr: false });
  
  try {
    const projects1 = await sdkWithoutNostr.getProjects(2, 0);
    console.log('Projects without Nostr:', projects1);
  } catch (error) {
    console.error('Error getting projects without Nostr:', error);
  }

  // Test with Nostr (enabled)
  console.log('\n=== Testing SDK with Nostr ===');
  const sdkWithNostr = new AngorHubSDK('mainnet', { enableNostr: true });
  
  try {
    const projects2 = await sdkWithNostr.getProjects(2, 0);
    console.log('Projects with Nostr:', projects2);
  } catch (error) {
    console.error('Error getting projects with Nostr:', error);
  }
}

testSDK().catch(console.error);
