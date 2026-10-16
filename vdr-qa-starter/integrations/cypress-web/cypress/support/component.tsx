import React from 'react';
import {mount} from 'cypress/react';
import {MemoryRouter} from 'react-router-dom';

// Local mount with router only; no live API or JWT needed for PdfViewer.
Cypress.Commands.add('mount', (component: React.ReactNode) =>
  mount(<MemoryRouter initialEntries={['/']}>{component}</MemoryRouter>)
);

declare global {
  namespace Cypress {
    interface Chainable {
      mount(component: React.ReactNode): Chainable<void>;
    }
  }
}
