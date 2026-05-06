import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openFreshApp(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');
  await expect(page.locator('.render-status')).toHaveText('success');
}

test.describe('diagram-as-code smoke', () => {
  test('opens the workbench and renders a non-empty Mermaid preview', async ({ page }) => {
    await openFreshApp(page);

    await expect(page.getByText('Diagram as Code')).toBeVisible();
    await expect(page.getByRole('button', { name: /architecture\/system-flow\.mmd/i })).toBeVisible();
    await expect(page.locator('.cm-content')).toContainText('flowchart LR');

    const svg = page.locator('.preview-svg svg');
    await expect(svg).toBeVisible();
    await expect
      .poll(async () => svg.evaluate((element) => element.outerHTML.length))
      .toBeGreaterThan(100);
  });

  test('changes templates and exports the rendered SVG', async ({ page }) => {
    await openFreshApp(page);

    await page.getByLabel('Template').selectOption('sequence');
    await expect(page.locator('.cm-content')).toContainText('sequenceDiagram');
    await expect(page.locator('.render-status')).toHaveText('success');

    const downloadPromise = page.waitForEvent('download');
    await page.getByTitle('Export SVG').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('diagram.svg');
  });

  test('supports preview controls and tool palette snippet insertion', async ({ page }) => {
    await openFreshApp(page);

    const panButton = page.getByTitle('Pan mode');
    await panButton.click();
    await expect(panButton).toHaveClass(/is-active/);

    await page.getByTitle('Zoom in').click();
    await expect(page.locator('.zoom-readout')).not.toHaveText('100%');

    await page.getByTitle('Reset view').click();
    await expect(page.locator('.zoom-readout')).toHaveText('100%');

    await page.getByTitle('Rectangle - click or drag').click();

    await expect(page.locator('.cm-content')).toContainText('Node1[New node]');
  });

  test('opens flowchart edge settings from the Edge tool', async ({ page }) => {
    await openFreshApp(page);

    await page.getByTitle('Edge - click or drag').click();

    await expect(page.getByLabel('Edge source')).toBeFocused();
    await expect(page.getByTitle('Edge - click or drag')).toHaveClass(/is-active/);
    await expect(page.locator('.cm-content')).not.toContainText('Source --> Target');
  });

  test('connects flowchart nodes by clicking preview nodes in Edge mode', async ({ page }) => {
    await openFreshApp(page);

    await page.getByTitle('Edge - click or drag').click();
    await page.locator('[data-flowchart-node-id="Request"]').click();
    await expect(page.getByLabel('Edge source')).toHaveValue('Request');

    await page.locator('[data-flowchart-node-id="Response"]').click();

    await expect(page.getByLabel('Edge target')).toHaveValue('Response');
    await expect(page.locator('.cm-content')).toContainText('Request --> Response');
    await expect(page.locator('.render-status')).toHaveText('success');
  });

  test('connects flowchart nodes by dragging in the preview using edge settings', async ({ page }) => {
    await openFreshApp(page);

    await page.getByTitle('Edge - click or drag').click();
    await page.getByLabel('Edge type').selectOption('thick');
    await page.getByLabel('Edge label').fill('dragged');

    const source = page.locator('[data-flowchart-node-id="Gateway"]');
    const target = page.locator('[data-flowchart-node-id="Response"]');
    await expect(source).toBeVisible();
    await expect(target).toBeVisible();

    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();

    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    if (!sourceBox || !targetBox) {
      return;
    }

    const sourceCenter = {
      x: sourceBox.x + sourceBox.width / 2,
      y: sourceBox.y + sourceBox.height / 2,
    };
    const targetCenter = {
      x: targetBox.x + targetBox.width / 2,
      y: targetBox.y + targetBox.height / 2,
    };

    await page.mouse.move(sourceCenter.x, sourceCenter.y);
    await page.mouse.down();
    await page.mouse.move((sourceCenter.x + targetCenter.x) / 2, (sourceCenter.y + targetCenter.y) / 2, {
      steps: 6,
    });
    await expect(page.locator('.preview-edge-line-thick')).toBeVisible();
    await page.mouse.move(targetCenter.x, targetCenter.y, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByLabel('Edge source')).toHaveValue('Gateway');
    await expect(page.getByLabel('Edge target')).toHaveValue('Response');
    await expect(page.locator('.cm-content')).toContainText('Gateway == dragged ==> Response');
    await expect(page.locator('.render-status')).toHaveText('success');
  });

  test('selects preview nodes for editing and deletion', async ({ page }) => {
    await openFreshApp(page);

    await page.getByTitle('Select - click or drag').click();
    await expect(page.getByTitle('Select - click or drag')).toHaveClass(/is-active/);

    await page.locator('[data-flowchart-node-id="Auth"]').click();
    await expect(page.getByLabel('Node label')).toHaveValue('Authorized?');
    await expect(page.getByLabel(/^Edge source$/)).toHaveCount(0);
    await expect(page.getByTitle('Connect edge')).toHaveCount(0);

    await page.getByLabel('Node label').fill('Approved?');
    await page.getByLabel('Node shape').selectOption('rectangle');

    await expect(page.locator('.cm-content')).toContainText('Auth[Approved?]');
    await expect(page.locator('[data-flowchart-node-id="Auth"]')).toHaveClass(/is-selected/);

    await page.getByTitle('Delete selected node').click();

    await expect(page.locator('.cm-content')).not.toContainText('Auth[Approved?]');
    await expect(page.locator('.cm-content')).not.toContainText('Gateway --> Auth');
    await expect(page.locator('.render-status')).toHaveText('success');
  });

  test('selects and deletes preview edges', async ({ page }) => {
    await openFreshApp(page);

    await page.getByTitle('Select - click or drag').click();

    const edge = page.locator('.preview-flowchart-edge[data-flowchart-edge-id="1:Request:Gateway"]');
    const edgeHitArea = page.locator('.preview-flowchart-edge-hit-area[data-flowchart-edge-id="1:Request:Gateway"]');
    await expect(edge).toHaveCount(1);
    await expect(edgeHitArea).toHaveCount(1);
    const edgePoint = await edgeHitArea.evaluate((element) => {
      const rect = element.getBoundingClientRect();

      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    });

    await page.mouse.click(edgePoint.x, edgePoint.y);

    await expect(page.getByLabel('Selected edge', { exact: true })).toContainText('Request');
    await expect(page.getByLabel('Selected edge', { exact: true })).toContainText('Gateway');
    await expect(edge).toHaveClass(/is-selected/);
    await expect(page.getByLabel('Selected edge source')).toHaveValue('Request');
    await expect(page.getByLabel('Selected edge target')).toHaveValue('Gateway');
    await expect(page.getByLabel(/^Edge source$/)).toHaveCount(0);

    await page.getByLabel('Selected edge type').selectOption('dotted');
    await page.getByLabel('Selected edge label').fill('cached');

    await expect(page.locator('.cm-content')).toContainText('Request -. cached .-> Gateway');
    await expect(page.locator('.cm-content')).toContainText('Request[Client Request]');
    await expect(page.locator('.cm-content')).toContainText('Gateway[API Gateway]');

    await page.getByTitle('Delete selected edge').click();

    await expect(page.locator('.cm-content')).not.toContainText('Request[Client Request] --> Gateway[API Gateway]');
    await expect(page.locator('.cm-content')).not.toContainText('Request -. cached .-> Gateway');
    await expect(page.locator('.cm-content')).toContainText('Request[Client Request]');
    await expect(page.locator('.cm-content')).toContainText('Gateway[API Gateway]');
    await expect(page.locator('.render-status')).toHaveText('success');
  });

  test('inserts Mermaid-safe tool snippets for sequence diagrams', async ({ page }) => {
    await openFreshApp(page);

    await page.getByRole('button', { name: /docs\/api-sequence\.md/i }).click();
    await expect(page.locator('.cm-content')).toContainText('sequenceDiagram');

    await page.getByTitle('Edge - click or drag').click();

    await expect(page.locator('.cm-content')).toContainText('Source->>Target: Message');
    await expect(page.locator('.render-status')).toHaveText('success');
  });

  test('shows labels for icon-only tool buttons', async ({ page }) => {
    await openFreshApp(page);

    const tool = page.getByLabel('Rectangle - click or drag');

    await expect(tool).toHaveAttribute('title', 'Rectangle - click or drag');
    await tool.hover();

    const tooltip = page.getByRole('tooltip', { name: 'Rectangle - click or drag' });
    await expect(tooltip).toBeVisible();

    const box = await tooltip.boundingBox();
    const viewport = page.viewportSize();

    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (!box || !viewport) {
      return;
    }

    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  });

  test('updates preview after CodeMirror typing', async ({ page, browserName }) => {
    await openFreshApp(page);

    const modifier = browserName === 'webkit' ? 'Meta' : process.platform === 'darwin' ? 'Meta' : 'Control';
    const editor = page.locator('.cm-content');

    await editor.click();
    await page.keyboard.press(`${modifier}+A`);
    await page.keyboard.type(`flowchart LR
  TypedStart[Typed start] --> TypedEnd[Typed end]`);

    await expect(editor).toContainText('TypedStart');
    await expect(page.locator('.render-status')).toHaveText('success');
    await expect
      .poll(async () => page.locator('.preview-svg svg').evaluate((element) => element.outerHTML))
      .toContain('Typed start');
  });

  test('supports pointer drag from tool palette to editor drop target', async ({ page }) => {
    await openFreshApp(page);

    const tool = page.getByTitle('Decision - click or drag');
    const target = page.locator('.editor-panel');
    const toolBox = await tool.boundingBox();
    const targetBox = await target.boundingBox();

    expect(toolBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    if (!toolBox || !targetBox) {
      return;
    }

    await page.mouse.move(toolBox.x + toolBox.width / 2, toolBox.y + toolBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
      steps: 12,
    });
    await page.mouse.up();

    await expect(page.locator('.cm-content')).toContainText('Decision1{Decision?}');
  });

  test('edits flowchart nodes and adds edges through the structure panel', async ({ page }) => {
    await openFreshApp(page);

    await page.getByLabel('Auth Authorized?').click();
    await page.getByLabel('Node label').fill('Approved?');
    await page.getByLabel('Node shape').selectOption('rectangle');

    await expect(page.locator('.cm-content')).toContainText('Auth[Approved?]');

    await page.getByTitle('Edge - click or drag').click();
    await page.getByLabel('Edge source').selectOption('Request');
    await page.getByLabel('Edge target').selectOption('Response');
    await page.getByLabel('Edge type').selectOption('dotted');
    await page.getByLabel('Edge label').fill('returns');
    await page.getByTitle('Connect edge').click();

    await expect(page.locator('.cm-content')).toContainText('Request -. returns .-> Response');
    await expect(page.locator('.render-status')).toHaveText('success');
  });

  test('previews and applies a mock AI proposal through the render pipeline', async ({ page }) => {
    await openFreshApp(page);

    await page.getByTitle('Generate mock AI proposal').click();
    await expect(page.getByLabel('Proposal diff')).toContainText('+  AIReview');

    await page.getByTitle('Apply proposal').click();

    await expect(page.locator('.cm-content')).toContainText('AIReview');
    await expect(page.locator('.render-status')).toHaveText('success');
    await expect
      .poll(async () => page.locator('.preview-svg svg').evaluate((element) => element.outerHTML))
      .toContain('AI review');
  });

  test('syncs collaboration edits between two browser sessions', async ({ browser, browserName }) => {
    const roomId = `e2e-${Date.now()}`;
    const launch = encodeURIComponent(
      JSON.stringify({
        mode: 'collaboration',
        workspaceId: 'e2e',
        target: {
          kind: 'file',
          uri: 'sample://architecture/system-flow.mmd',
          dialect: 'mermaid',
        },
        roomId,
      }),
    );
    const modifier = browserName === 'webkit' ? 'Meta' : process.platform === 'darwin' ? 'Meta' : 'Control';
    const firstContext = await browser.newContext();
    const secondContext = await browser.newContext();

    await Promise.all([
      firstContext.addInitScript(() => window.localStorage.clear()),
      secondContext.addInitScript(() => window.localStorage.clear()),
    ]);

    const firstPage = await firstContext.newPage();
    const secondPage = await secondContext.newPage();

    try {
      await firstPage.goto(`/?launch=${launch}`);
      await expect(firstPage.getByLabel('Collaboration')).toContainText(roomId);
      await expect(firstPage.getByLabel('Collaboration')).toContainText('synced', { timeout: 15_000 });
      await expect(firstPage.locator('.render-status')).toHaveText('success');

      await secondPage.goto(`/?launch=${launch}`);
      await expect(secondPage.getByLabel('Collaboration')).toContainText(roomId);
      await expect(secondPage.getByLabel('Collaboration')).toContainText('synced', { timeout: 15_000 });
      await expect(secondPage.locator('.render-status')).toHaveText('success');

      const firstEditor = firstPage.locator('.cm-content');
      const secondEditor = secondPage.locator('.cm-content');

      await firstEditor.click();
      await firstPage.keyboard.press(`${modifier}+A`);
      await firstPage.keyboard.press('Backspace');
      await firstPage.keyboard.insertText(`flowchart LR
  RemoteStart[Remote start] --> RemoteEnd[Remote end]`);

      await expect(secondEditor).toContainText('RemoteStart', { timeout: 15_000 });
      await expect(secondPage.locator('.render-status')).toHaveText('success');
    } finally {
      await firstContext.close();
      await secondContext.close();
    }
  });
});
