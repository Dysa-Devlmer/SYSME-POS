import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommandPalette from '../CommandPalette';

describe('CommandPalette Component', () => {
  it('renders when isOpen is true', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={() => {}}
        onNavigate={() => {}}
      />
    );

    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CommandPalette
        isOpen={false}
        onClose={() => {}}
        onNavigate={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('filters commands based on search input', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={() => {}}
        onNavigate={() => {}}
      />
    );

    const input = screen.getByPlaceholderText(/buscar/i);
    fireEvent.change(input, { target: { value: 'chat' } });

    // Should show chat-related command
    expect(screen.getByText(/chat/i)).toBeInTheDocument();
  });

  it('calls onClose when ESC is pressed', () => {
    const onClose = vi.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        onNavigate={() => {}}
      />
    );

    const input = screen.getByPlaceholderText(/buscar/i);
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onNavigate when a command is selected', () => {
    const onNavigate = vi.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={() => {}}
        onNavigate={onNavigate}
      />
    );

    // Click on the first command (it's a div, not a button)
    const firstCommand = screen.getByText(/Ir a Dashboard/i).closest('div[class*="cursor-pointer"]');
    fireEvent.click(firstCommand);

    expect(onNavigate).toHaveBeenCalled();
  });
});
