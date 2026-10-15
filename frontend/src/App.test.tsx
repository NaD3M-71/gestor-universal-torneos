import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Frontend Smoke Test', () => {
  it('debería ejecutar tests de componentes correctamente', () => {
    render(<div>Hola Vitest</div>);
    expect(screen.getByText('Hola Vitest')).toBeInTheDocument();
  });
});