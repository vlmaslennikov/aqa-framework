import React from 'react';
import {PdfViewer} from '../../src/components/pdf-viewer';

// NOTE: file is copied to apps/web/cypress/component/pdf-viewer.cy.tsx.
// The import above should be changed to: ../../src/components/pdf-viewer (it is already correct for that location).
// Test just the React component, no network traffic and no Supabase.
const props = {
  fileName:'test-document.pdf',
  size:1024,
  viewUrl:undefined as string | undefined,
  viewUrlError:false,
  onRetryView:()=>{},
  onDownload:()=>{},
  downloadPending:false,
  onClose:{to:'/room/550e8400-e29b-41d4-a716-446655440000'},
};

describe('PdfViewer — component regressions',()=>{
  it('shows file identity and pending placeholder while view URL is not ready',()=>{
    cy.mount(<PdfViewer {...props} onRetryView={cy.stub()} onDownload={cy.stub()}/>);
    cy.contains('test-document.pdf').should('be.visible');
    cy.get('object[type="application/pdf"]').should('not.exist');
    cy.contains('button','Download').should('be.visible').and('not.be.disabled');
  });

  it('renders a PDF object after a signed URL becomes available',()=>{
    const inlinePdf='data:application/pdf;base64,JVBERi0xLjQKJUVPRg==';
    cy.mount(<PdfViewer {...props} viewUrl={inlinePdf} onDownload={cy.stub()} onRetryView={cy.stub()}/>);
    cy.get('object[type="application/pdf"]').should('have.attr','data',inlinePdf);
  });

  it('offers retry and alternate download on a failed preview',()=>{
    const retry=cy.stub().as('retry');
    const download=cy.stub().as('download');
    cy.mount(<PdfViewer {...props} viewUrlError onRetryView={retry} onDownload={download}/>);
    cy.contains('Could not load this file for preview.').should('be.visible');
    cy.contains('button','Retry').click();
    cy.get('@retry').should('have.been.calledOnce');
    cy.contains('button','Download instead').click();
    cy.get('@download').should('have.been.calledOnce');
  });

  it('disables download actions while a download is pending',()=>{
    cy.mount(<PdfViewer {...props} onRetryView={cy.stub()} onDownload={cy.stub()} downloadPending/>);
    cy.contains('button','Preparing...').should('be.disabled');
  });
});
