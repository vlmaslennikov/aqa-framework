import { MemoryRouter } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { mount } from 'cypress/react';
import { PdfViewer } from '../../src/components/pdf-viewer';

const preview = 'data:application/pdf;base64,JVBERi0xLjQKJSVFT0YK';
function renderPdf(props: Partial<ComponentProps<typeof PdfViewer>> = {}) {
  const onRetryView = cy.stub().as('retry');
  const onDownload = cy.stub().as('download');
  mount(<MemoryRouter><PdfViewer
    fileName="Overview.pdf" size={1024} viewUrl={preview}
    viewUrlError={false} onRetryView={onRetryView} onDownload={onDownload}
    downloadPending={false} {...props}
  /></MemoryRouter>);
}

describe('PdfViewer: React component', () => {
  it('shows filename and inline PDF object', () => {
    renderPdf();
    cy.contains('Overview.pdf').should('be.visible');
    cy.get('object[type="application/pdf"]').should('have.attr', 'data', preview);
    cy.contains('button', 'Download').should('not.be.disabled');
  });
  it('shows loading skeleton until viewUrl resolves', () => {
    renderPdf({ viewUrl: undefined });
    cy.get('object[type="application/pdf"]').should('not.exist');
    cy.contains('Overview.pdf').should('be.visible');
  });
  it('offers retry and fallback download on preview error', () => {
    renderPdf({ viewUrlError: true, viewUrl: undefined });
    cy.contains('Could not load this file for preview.').should('be.visible');
    cy.contains('button', 'Retry').click();
    cy.get('@retry').should('have.been.calledOnce');
    cy.contains('button', 'Download instead').click();
    cy.get('@download').should('have.been.calledOnce');
  });
  it('disables duplicate downloads while pending', () => {
    renderPdf({ downloadPending: true });
    cy.contains('button', 'Preparing...').should('be.disabled');
  });
});
