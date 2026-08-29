import { describe, it, expect } from 'vitest';
import { ASSISTANT_TOOLS, TOOL_OPERATION_NAMES, getToolOperation } from '@shiftos/api';

describe('tool dispatch table', () => {
  it('has a dispatch entry for every non-navigate tool in the catalog', () => {
    const nonNavigateNames = ASSISTANT_TOOLS.map((t) => t.function.name).filter((n) => n !== 'navigate');
    for (const name of nonNavigateNames) {
      expect(TOOL_OPERATION_NAMES).toContain(name);
      const operation = getToolOperation(name);
      expect(operation).toBeDefined();
      expect(operation!.name).toBe(name);
    }
  });

  it('returns undefined for navigate and for an unknown tool name', () => {
    expect(getToolOperation('navigate')).toBeUndefined();
    expect(getToolOperation('not_a_real_tool')).toBeUndefined();
  });
});
