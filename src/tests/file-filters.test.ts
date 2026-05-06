import { describe, expect, it } from 'vitest';
import { isDiagramFile, listSupportedExtensions } from '../workspace/file-filters';

describe('file filters', () => {
  it('accepts supported diagram files', () => {
    expect(isDiagramFile('docs/flow.mmd')).toBe(true);
    expect(isDiagramFile('docs/architecture.MD')).toBe(true);
    expect(isDiagramFile('model/schema.dbml')).toBe(true);
  });

  it('rejects unrelated files', () => {
    expect(isDiagramFile('src/App.tsx')).toBe(false);
    expect(isDiagramFile('README')).toBe(false);
  });

  it('returns deterministic extension list', () => {
    expect(listSupportedExtensions()[0]).toBe('.d2');
  });
});
