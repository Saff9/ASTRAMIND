import { render, screen } from '@testing-library/react';
import { InputArea } from './InputArea';

test('renders InputArea without crashing', () => {
  const mockOnSend = jest.fn();
  render(<InputArea onSend={mockOnSend} />);
  const textarea = screen.getByPlaceholderText('Type a message...');
  expect(textarea).toBeInTheDocument();
});
