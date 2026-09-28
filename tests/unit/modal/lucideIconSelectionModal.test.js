import { describe, expect, it, vi } from 'vitest';
import { LucideIconSelectionModal } from '@/modal/modals/lucideIconSelectionModal.js';

describe('LucideIconSelectionModal', () => {
  it('lists Obsidian Lucide icons and returns the selected name', () => {
    const onChoose = vi.fn();
    const modal = new LucideIconSelectionModal({}, onChoose);
    expect(modal.getItems()).toContain('heart');
    modal.onChooseItem('heart');
    expect(onChoose).toHaveBeenCalledWith('heart');
  });
});
