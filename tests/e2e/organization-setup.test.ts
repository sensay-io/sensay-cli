import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import nock from 'nock';
import { simpleOrganizationSetupCommand } from '../../src/commands/simple-organization-setup';
import { ConfigManager } from '../../src/config/manager';
import { suppressConsole, restoreConsole } from '../setup';

// Mock the ProgressManager to avoid spinner issues in tests
jest.mock('../../src/utils/progress', () => ({
  ProgressManager: jest.fn().mockImplementation(() => ({
    createSpinner: jest.fn().mockReturnValue({
      succeed: jest.fn(),
      fail: jest.fn(),
      stop: jest.fn()
    }),
    updateSpinner: jest.fn(),
    succeedSpinner: jest.fn(),
    failSpinner: jest.fn(),
    stopSpinner: jest.fn(),
    displayTrainingProgress: jest.fn(),
    pollTrainingStatus: jest.fn().mockImplementation(async () => {
      // Mock the training status polling - just return without making API calls
      return Promise.resolve();
    })
  }))
}));

describe('Organization Setup E2E Test', () => {
  let tempDir: string;
  let testProjectDir: string;

  beforeAll(() => {
    // Setup nock to intercept HTTP requests
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
    nock.cleanAll();
  });

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sensay-test-'));
    testProjectDir = path.join(tempDir, 'test-project');
    await fs.ensureDir(testProjectDir);

    // Suppress console output during tests
    suppressConsole();
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await fs.remove(tempDir);
    restoreConsole();
    nock.cleanAll();
    jest.clearAllMocks();
  });

  test('should complete organization setup with system message and training data', async () => {
    // Setup test project structure
    await setupTestProject();

    // Mock API responses
    setupApiMocks();

    // Clear any existing mocks
    jest.clearAllMocks();

    // Mock user config with API key
    jest.spyOn(ConfigManager, 'getEffectiveConfig').mockResolvedValue({
      apiKey: 'test-api-key',
      organizationId: 'test-org-id'
    });

    // Mock empty project config initially
    jest.spyOn(ConfigManager, 'getMergedConfig').mockResolvedValue({
      userConfig: { apiKey: 'test-api-key' },
      projectConfig: {}
    });

    // Mock config saving
    const saveProjectConfigSpy = jest.spyOn(ConfigManager, 'saveProjectConfig').mockResolvedValue();

    // Run the organization setup command
    await simpleOrganizationSetupCommand(testProjectDir, {
      organizationName: 'Test Organization',
      userName: 'Test User',
      userEmail: 'test@example.com',
      replicaName: 'Test Replica'
    });

    // Verify API calls were made
    expect(nock.isDone()).toBe(true);

    // Verify project config was saved multiple times with expected data
    expect(saveProjectConfigSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationName: 'Test Organization',
        userName: 'Test User',
        userEmail: 'test@example.com',
        replicaName: 'Test Replica'
      }),
      testProjectDir
    );

    expect(saveProjectConfigSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123'
      }),
      testProjectDir
    );

    expect(saveProjectConfigSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        replicaId: 'replica-456'
      }),
      testProjectDir
    );
  });

  test('should handle existing user and replica gracefully', async () => {
    await setupTestProject();

    // Mock API responses for existing resources
    const apiScope = nock('https://api.sensay.io')
      .get('/v1/users/me')
      .reply(200, {
        id: 'existing-user-123',
        name: 'Existing User',
        email: 'existing@example.com'
      })
      .get('/v1/replicas')
      .reply(200, {
        replicas: [
          {
            id: 'existing-replica-456',
            name: 'Test Replica',
            systemMessage: 'Old system message'
          }
        ]
      })
      .put('/v1/replicas/existing-replica-456')
      .reply(200, { success: true })
      .delete('/v1/replicas/existing-replica-456/training')
      .reply(200, { success: true })
      .post('/v1/replicas/existing-replica-456/training')
      .times(3) // Three training files (including subdirectory file)
      .reply(200, { success: true });

    // Clear any existing mocks from previous tests
    jest.clearAllMocks();

    jest.spyOn(ConfigManager, 'getEffectiveConfig').mockResolvedValue({
      apiKey: 'test-api-key',
      organizationId: 'test-org-id'
    });

    jest.spyOn(ConfigManager, 'getMergedConfig').mockResolvedValue({
      userConfig: { apiKey: 'test-api-key' },
      projectConfig: {}
    });

    const saveProjectConfigSpy = jest.spyOn(ConfigManager, 'saveProjectConfig').mockResolvedValue();

    await simpleOrganizationSetupCommand(testProjectDir, {
      organizationName: 'Test Organization',
      userName: 'Test User',
      userEmail: 'test@example.com',
      replicaName: 'Test Replica'
    });

    expect(apiScope.isDone()).toBe(true);
    // Check that config was saved with user ID
    expect(saveProjectConfigSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'existing-user-123'
      }),
      testProjectDir
    );
    
    // Check that config was saved with replica ID
    expect(saveProjectConfigSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        replicaId: 'existing-replica-456'
      }),
      testProjectDir
    );
  });

  test('should handle missing system message and training data gracefully', async () => {
    // Create project without system message or training data
    await fs.ensureDir(testProjectDir);

    const apiScope = nock('https://api.sensay.io')
      .get('/v1/users/me')
      .reply(404, { message: 'User not found' })
      .post('/v1/users')
      .reply(200, {
        id: 'new-user-789',
        name: 'Test User',
        email: 'test@example.com'
      })
      .get('/v1/replicas')
      .reply(200, { replicas: [] })
      .post('/v1/replicas')
      .reply(200, {
        id: 'new-replica-789',
        name: 'Test Replica'
      });

    jest.spyOn(ConfigManager, 'getEffectiveConfig').mockResolvedValue({
      apiKey: 'test-api-key',
      organizationId: 'test-org-id'
    });

    jest.spyOn(ConfigManager, 'getMergedConfig').mockResolvedValue({
      userConfig: { apiKey: 'test-api-key' },
      projectConfig: {}
    });

    jest.spyOn(ConfigManager, 'saveProjectConfig').mockResolvedValue();

    await simpleOrganizationSetupCommand(testProjectDir, {
      organizationName: 'Test Organization',
      userName: 'Test User',
      userEmail: 'test@example.com',
      replicaName: 'Test Replica'
    });

    expect(apiScope.isDone()).toBe(true);
  });

  test('should fail gracefully when API key is missing', async () => {
    await setupTestProject();

    jest.spyOn(ConfigManager, 'getEffectiveConfig').mockResolvedValue({});
    const mockExit = jest.spyOn(process, 'exit');
    mockExit.mockImplementation(() => {
      throw new Error('Process exited with code 1');
    });

    await expect(
      simpleOrganizationSetupCommand(testProjectDir, {
        organizationName: 'Test Organization',
        userName: 'Test User',
        userEmail: 'test@example.com',
        replicaName: 'Test Replica'
      })
    ).rejects.toThrow('Process exited with code 1');
  });

  // Helper function to setup test project structure
  async function setupTestProject(): Promise<void> {
    // Create system message file
    const systemMessage = 'You are a helpful AI assistant specialized in customer support. Always be polite and professional.';
    await fs.writeFile(path.join(testProjectDir, 'system-message.txt'), systemMessage);

    // Create training data directory and files
    const trainingDataDir = path.join(testProjectDir, 'training-data');
    await fs.ensureDir(trainingDataDir);

    // Training file 1: Customer conversation
    const conversation1 = `Customer: Hi, I'm having trouble with my order.
Support: I'd be happy to help you with your order. Can you please provide your order number?
Customer: Sure, it's #12345.
Support: Thank you. I can see your order here. What specific issue are you experiencing?
Customer: The item arrived damaged.
Support: I apologize for the inconvenience. We'll send you a replacement right away and provide a prepaid return label for the damaged item.
Customer: That's great, thank you so much!
Support: You're welcome! Is there anything else I can help you with today?`;

    await fs.writeFile(path.join(trainingDataDir, 'conversation1.txt'), conversation1);

    // Training file 2: Knowledge base content
    const knowledge = `Product Information:
- Our premium subscription includes 24/7 support
- Standard shipping takes 3-5 business days
- Express shipping takes 1-2 business days
- We offer a 30-day money-back guarantee
- Returns can be initiated through our website or by contacting support

Common Issues:
- Login problems: Check password and try clearing browser cache
- Payment failures: Verify card details and billing address
- Shipping delays: Check tracking number and carrier updates
- Product defects: Contact support for replacement or refund`;

    await fs.writeFile(path.join(trainingDataDir, 'knowledge.txt'), knowledge);

    // Create a subdirectory with additional training data
    const subDir = path.join(trainingDataDir, 'advanced');
    await fs.ensureDir(subDir);

    const advancedContent = `Advanced Troubleshooting:
1. Clear application cache
2. Update to latest version
3. Check network connectivity
4. Contact technical support if issues persist`;

    await fs.writeFile(path.join(subDir, 'troubleshooting.md'), advancedContent);

    // Create a file that should be skipped (unsupported extension)
    await fs.writeFile(path.join(trainingDataDir, 'image.png'), 'fake image data');
  }

  // Helper function to setup API mocks
  function setupApiMocks(): void {
    nock('https://api.sensay.io')
      // Mock getting current user (not found, so create new)
      .get('/v1/users/me')
      .reply(404, { message: 'User not found' })
      
      // Mock creating new user
      .post('/v1/users')
      .reply(200, {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com'
      })
      
      // Mock getting replicas (empty list)
      .get('/v1/replicas')
      .reply(200, { replicas: [] })
      
      // Mock creating new replica
      .post('/v1/replicas')
      .reply(200, {
        id: 'replica-456',
        name: 'Test Replica'
      })
      
      // Mock updating system message
      .put('/v1/replicas/replica-456')
      .reply(200, { success: true })
      
      // Mock clearing training data
      .delete('/v1/replicas/replica-456/training')
      .reply(200, { success: true })
      
      // Mock uploading training files (3 files: 2 txt + 1 md)
      .post('/v1/replicas/replica-456/training')
      .times(3)
      .reply(200, { success: true });
  }
});