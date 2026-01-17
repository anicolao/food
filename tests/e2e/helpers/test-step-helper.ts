import { type Page, type TestInfo, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface Verification {
    spec: string;
    check: () => Promise<void>;
}

export interface StepOptions {
    description: string;
    verifications: Verification[];
}

interface DocStep {
    title: string;
    image: string;
    specs: string[];
}

export class TestStepHelper {
    private stepCount = 0;
    private steps: DocStep[] = [];

    constructor(private page: Page, private testInfo: TestInfo) { }

    setMetadata(title: string, description: string) {
        // Ideally store this for the doc header
    }

    async step(id: string, options: StepOptions) {
        // 1. Run Verification
        for (const v of options.verifications) {
            await v.check();
        }

        // 2. Generate Name
        const paddedIndex = String(this.stepCount++).padStart(3, '0');
        const filename = `${paddedIndex}-${id.replace(/_/g, '-')}.png`;

        // 3. Stabilization: Wait for Network Sync (if present)
        const networkStatus = this.page.locator('button[data-status]');
        if (await networkStatus.count() > 0 && await networkStatus.isVisible()) {
            // Wait for it to be 'synced' or 'offline' (if we are testing offline mode, we might expect offline)
            // But usually we want stable 'synced'.
            // If the test puts it in offline mode, it will say 'offline'.
            // We just want to avoid 'pending' or 'syncing'.
            await expect(networkStatus).not.toHaveAttribute('data-status', 'pending', { timeout: 30000 });
            await expect(networkStatus).not.toHaveAttribute('data-status', 'syncing', { timeout: 30000 });
        }

        // 4. Capture & Verify (Zero-Pixel Tolerance)
        // This will check against the baseline in 'screenshots/{filename}'.
        // If the file doesn't exist, it will fail (unless --update-snapshots is used).
        await expect(this.page).toHaveScreenshot(filename.replace(/\.png$/, ''));

        // 4. Record for Docs
        this.steps.push({
            title: options.description,
            image: `./screenshots/${filename}`,
            specs: options.verifications.map(v => v.spec)
        });
    }

    generateDocs() {
        const docPath = path.join(path.dirname(this.testInfo.file), 'README.md');
        let content = `# Test: ${this.testInfo.title}\n\n`;

        for (const step of this.steps) {
            content += `## ${step.title}\n\n`;
            content += `![${step.title}](${step.image})\n\n`;
            content += `**Verifications:**\n`;
            for (const spec of step.specs) {
                content += `- [x] ${spec}\n`;
            }
            content += `\n---\n\n`;
        }

        fs.writeFileSync(docPath, content);
    }
}
