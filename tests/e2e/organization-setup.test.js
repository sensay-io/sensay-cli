"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const nock_1 = __importDefault(require("nock"));
const simple_organization_setup_1 = require("../../src/commands/simple-organization-setup");
const manager_1 = require("../../src/config/manager");
const setup_1 = require("../setup");
describe('Organization Setup E2E Test', () => {
    let tempDir;
    let testProjectDir;
    beforeAll(() => {
        // Setup nock to intercept HTTP requests
        nock_1.default.disableNetConnect();
    });
    afterAll(() => {
        nock_1.default.enableNetConnect();
        nock_1.default.cleanAll();
    });
    beforeEach(async () => {
        // Create temporary directory for each test
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sensay-test-'));
        testProjectDir = path.join(tempDir, 'test-project');
        await fs.ensureDir(testProjectDir);
        // Suppress console output during tests
        (0, setup_1.suppressConsole)();
    });
    afterEach(async () => {
        // Cleanup temporary directory
        await fs.remove(tempDir);
        (0, setup_1.restoreConsole)();
        nock_1.default.cleanAll();
    });
    test('should complete organization setup with system message and training data', async () => {
        // Setup test project structure
        await setupTestProject();
        // Mock API responses
        setupApiMocks();
        // Mock user config with API key
        jest.spyOn(manager_1.ConfigManager, 'getEffectiveConfig').mockResolvedValue({
            apiKey: 'test-api-key',
            organizationId: 'test-org-id'
        });
        // Mock empty project config initially
        jest.spyOn(manager_1.ConfigManager, 'getMergedConfig').mockResolvedValue({
            userConfig: { apiKey: 'test-api-key' },
            projectConfig: {}
        });
        // Mock config saving
        const saveProjectConfigSpy = jest.spyOn(manager_1.ConfigManager, 'saveProjectConfig').mockResolvedValue();
        // Run the organization setup command
        await (0, simple_organization_setup_1.simpleOrganizationSetupCommand)(testProjectDir, {
            organizationName: 'Test Organization',
            userName: 'Test User',
            userEmail: 'test@example.com',
            replicaName: 'Test Replica'
        });
        // Verify API calls were made
        expect(nock_1.default.isDone()).toBe(true);
        // Verify project config was saved multiple times with expected data
        expect(saveProjectConfigSpy).toHaveBeenCalledWith(expect.objectContaining({
            organizationName: 'Test Organization',
            userName: 'Test User',
            userEmail: 'test@example.com',
            replicaName: 'Test Replica'
        }), testProjectDir);
        expect(saveProjectConfigSpy).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-123'
        }), testProjectDir);
        expect(saveProjectConfigSpy).toHaveBeenCalledWith(expect.objectContaining({
            replicaId: 'replica-456'
        }), testProjectDir);
    });
    test('should handle existing user and replica gracefully', async () => {
        await setupTestProject();
        // Mock API responses for existing resources
        const apiScope = (0, nock_1.default)('https://api.sensay.io')
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
            .times(2) // Two training files
            .reply(200, { success: true })
            .get('/v1/replicas/existing-replica-456/training/status')
            .times(2) // Called twice during polling
            .reply(200, {
            status: 'completed',
            files: [
                { name: 'conversation1.txt', status: 'completed' },
                { name: 'knowledge.txt', status: 'completed' }
            ]
        });
        jest.spyOn(manager_1.ConfigManager, 'getEffectiveConfig').mockResolvedValue({
            apiKey: 'test-api-key',
            organizationId: 'test-org-id'
        });
        jest.spyOn(manager_1.ConfigManager, 'getMergedConfig').mockResolvedValue({
            userConfig: { apiKey: 'test-api-key' },
            projectConfig: {}
        });
        const saveProjectConfigSpy = jest.spyOn(manager_1.ConfigManager, 'saveProjectConfig').mockResolvedValue();
        await (0, simple_organization_setup_1.simpleOrganizationSetupCommand)(testProjectDir, {
            organizationName: 'Test Organization',
            userName: 'Test User',
            userEmail: 'test@example.com',
            replicaName: 'Test Replica'
        });
        expect(apiScope.isDone()).toBe(true);
        expect(saveProjectConfigSpy).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'existing-user-123',
            replicaId: 'existing-replica-456'
        }), testProjectDir);
    });
    test('should handle missing system message and training data gracefully', async () => {
        // Create project without system message or training data
        await fs.ensureDir(testProjectDir);
        const apiScope = (0, nock_1.default)('https://api.sensay.io')
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
        jest.spyOn(manager_1.ConfigManager, 'getEffectiveConfig').mockResolvedValue({
            apiKey: 'test-api-key',
            organizationId: 'test-org-id'
        });
        jest.spyOn(manager_1.ConfigManager, 'getMergedConfig').mockResolvedValue({
            userConfig: { apiKey: 'test-api-key' },
            projectConfig: {}
        });
        jest.spyOn(manager_1.ConfigManager, 'saveProjectConfig').mockResolvedValue();
        await (0, simple_organization_setup_1.simpleOrganizationSetupCommand)(testProjectDir, {
            organizationName: 'Test Organization',
            userName: 'Test User',
            userEmail: 'test@example.com',
            replicaName: 'Test Replica'
        });
        expect(apiScope.isDone()).toBe(true);
    });
    test('should fail gracefully when API key is missing', async () => {
        await setupTestProject();
        jest.spyOn(manager_1.ConfigManager, 'getEffectiveConfig').mockResolvedValue({});
        jest.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`Process exited with code ${code}`);
        });
        await expect((0, simple_organization_setup_1.simpleOrganizationSetupCommand)(testProjectDir, {
            organizationName: 'Test Organization',
            userName: 'Test User',
            userEmail: 'test@example.com',
            replicaName: 'Test Replica'
        })).rejects.toThrow('Process exited with code 1');
    });
    // Helper function to setup test project structure
    async function setupTestProject() {
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
    function setupApiMocks() {
        (0, nock_1.default)('https://api.sensay.io')
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
            .reply(200, { success: true })
            // Mock training status polling (called multiple times)
            .get('/v1/replicas/replica-456/training/status')
            .times(3)
            .reply(200, {
            status: 'completed',
            files: [
                { name: 'conversation1.txt', status: 'completed' },
                { name: 'knowledge.txt', status: 'completed' },
                { name: 'advanced/troubleshooting.md', status: 'completed' }
            ]
        });
    }
});
//# sourceMappingURL=organization-setup.test.js.map