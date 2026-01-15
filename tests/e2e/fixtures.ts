import { test as base, expect } from '@playwright/test';

// Define custom worker fixtures
interface CustomWorkerFixtures {
    workerCheck: void;
}

export const test = base.extend<{}, CustomWorkerFixtures>({
    workerCheck: [async ({ }, use, testInfo) => {
        if (testInfo.config.workers > 1) {
            throw new Error(`
Configuration Error: E2E tests must be run serially to avoid state pollution and concurrency flakes.
Found workers: ${testInfo.config.workers}
Expected: 1

Please use 'npm run test:e2e' which sets '--workers=1', or explicitly pass '--workers=1' to your playwright command.
            `);
        }
        await use();
    }, { auto: true, scope: 'worker' }]
});

export { expect };
