import { AngorHubSDK } from '../src';

describe('AngorHubSDK', () => {
  const sdk = new AngorHubSDK('testnet');

  test('should fetch projects', async () => {
    const projects = await sdk.getProjects(2, 0);
    expect(projects.length).toBeGreaterThan(0);
  });
});
