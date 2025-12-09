import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationToast from '../NotificationToast';

describe('NotificationToast Component', () => {
  let mockSocket;

  beforeEach(() => {
    // Create a mock socket with event listeners
    mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    };
  });

  it('renders empty container initially', () => {
    const { container } = render(<NotificationToast socket={mockSocket} />);

    // Container should exist but be empty initially
    expect(container.querySelector('.fixed')).toBeInTheDocument();
  });

  it('registers socket event listeners', () => {
    render(<NotificationToast socket={mockSocket} />);

    // Should register all necessary event listeners
    expect(mockSocket.on).toHaveBeenCalledWith('notification', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('task:created', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('task:completed', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
  });

  it('displays notification when socket emits event', async () => {
    let notificationHandler;
    mockSocket.on.mockImplementation((event, handler) => {
      if (event === 'notification') {
        notificationHandler = handler;
      }
    });

    render(<NotificationToast socket={mockSocket} />);

    // Trigger notification
    notificationHandler({ message: 'Test notification', type: 'success' });

    // Wait for notification to appear
    await waitFor(() => {
      expect(screen.getByText('Test notification')).toBeInTheDocument();
    });
  });

  it('removes notification when close button is clicked', async () => {
    let notificationHandler;
    mockSocket.on.mockImplementation((event, handler) => {
      if (event === 'notification') {
        notificationHandler = handler;
      }
    });

    render(<NotificationToast socket={mockSocket} />);

    // Add notification
    notificationHandler({ message: 'Closeable notification', type: 'info' });

    await waitFor(() => {
      expect(screen.getByText('Closeable notification')).toBeInTheDocument();
    });

    // Click close button
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    // Notification should be removed
    await waitFor(() => {
      expect(screen.queryByText('Closeable notification')).not.toBeInTheDocument();
    });
  });
});
