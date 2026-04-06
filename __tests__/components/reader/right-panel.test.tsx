/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RightPanel } from '@/components/reader/right-panel';

// Mock sub-components to isolate right-panel logic
jest.mock('@/components/reader/panel-ai', () => ({
  PanelAI: () => <div data-testid="panel-ai" />,
}));
jest.mock('@/components/reader/panel-notes', () => ({
  PanelNotes: () => <div data-testid="panel-notes" />,
}));
jest.mock('@/components/reader/panel-tools', () => ({
  PanelTools: () => <div data-testid="panel-tools" />,
}));
jest.mock('@/lib/storage/local', () => ({
  localStore: {
    getNotes: () => [],
    getHighlights: () => [],
    getProgress: () => [],
    isRead: () => false,
  },
}));
jest.mock('@/components/providers/theme-provider', () => ({
  useTheme: () => ({ prefs: { theme: 'light', fontSize: 18, lineHeight: 1.7, fontFamily: 'serif' }, setPrefs: jest.fn() }),
}));

const baseProps = {
  isOpen: true,
  onToggle: jest.fn(),
  activeTab: 'ai' as const,
  onTabChange: jest.fn(),
  selectedVerse: null,
  verses: [],
  book: 'John',
  chapter: 3,
  highlights: [],
  notes: [],
  onHighlight: jest.fn(),
  onSaveNote: jest.fn(),
  onDeleteNote: jest.fn(),
  onEditNote: jest.fn(),
};

describe('RightPanel', () => {
  it('renders AI tab content when activeTab is ai', () => {
    render(<RightPanel {...baseProps} activeTab="ai" />);
    expect(screen.getByTestId('panel-ai')).toBeInTheDocument();
  });

  it('renders Notes tab content when activeTab is notes', () => {
    render(<RightPanel {...baseProps} activeTab="notes" />);
    expect(screen.getByTestId('panel-notes')).toBeInTheDocument();
  });

  it('renders Tools tab content when activeTab is tools', () => {
    render(<RightPanel {...baseProps} activeTab="tools" />);
    expect(screen.getByTestId('panel-tools')).toBeInTheDocument();
  });

  it('calls onTabChange when a tab button is clicked', () => {
    const onTabChange = jest.fn();
    render(<RightPanel {...baseProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('Notes'));
    expect(onTabChange).toHaveBeenCalledWith('notes');
  });

  it('calls onToggle when chevron button is clicked', () => {
    const onToggle = jest.fn();
    render(<RightPanel {...baseProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText('Collapse panel'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows icon strip and not tab content when collapsed', () => {
    render(<RightPanel {...baseProps} isOpen={false} />);
    expect(screen.queryByText('AI')).not.toBeInTheDocument();
    expect(screen.queryByTestId('panel-ai')).not.toBeInTheDocument();
  });
});
