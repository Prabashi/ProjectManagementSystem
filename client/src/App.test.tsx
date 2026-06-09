import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';

function renderWithProviders(ui: React.ReactElement) {
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('App', () => {
  it('renders the application heading', () => {
    renderWithProviders(<App />);
    expect(screen.getByText('Project Management System')).toBeInTheDocument();
  });
});
