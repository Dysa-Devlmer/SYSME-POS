import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatMessage from '../ChatMessage';

describe('ChatMessage Component', () => {
  it('renders user message correctly', () => {
    const message = {
      role: 'user',
      content: 'Hello JARVIS',
      timestamp: new Date().toISOString(),
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Hello JARVIS')).toBeInTheDocument();
    expect(screen.getByText('👤')).toBeInTheDocument();
  });

  it('renders assistant message correctly', () => {
    const message = {
      role: 'assistant',
      content: 'Good evening, Sir.',
      timestamp: new Date().toISOString(),
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Good evening, Sir.')).toBeInTheDocument();
    expect(screen.getByText('🤖')).toBeInTheDocument();
  });

  it('renders markdown content correctly', () => {
    const message = {
      role: 'assistant',
      content: '# Hello\n\nThis is **bold** text.',
      timestamp: new Date().toISOString(),
    };

    render(<ChatMessage message={message} />);

    // Check that markdown is rendered
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Hello');
  });

  it('displays timestamp', () => {
    const timestamp = new Date('2025-11-10T12:00:00').toISOString();
    const message = {
      role: 'user',
      content: 'Test',
      timestamp,
    };

    render(<ChatMessage message={message} />);

    // Timestamp should be displayed
    expect(screen.getByText(/12:00/)).toBeInTheDocument();
  });
});
