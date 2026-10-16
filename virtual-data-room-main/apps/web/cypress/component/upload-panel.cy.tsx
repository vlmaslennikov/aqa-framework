import { mount } from 'cypress/react';
import { UploadPanel } from '../../src/features/data-room/upload/upload-panel';
import type { UploadTask } from '../../src/features/data-room/upload/use-upload-queue';

function task(status: UploadTask['status'], id = 'task-1'): UploadTask {
  return {
    id, name: 'Overview.pdf', file: new File(['%PDF-1.4'], 'Overview.pdf', { type: 'application/pdf' }),
    status, progress: 40, ...(status === 'error' ? { error: 'Network error' } : {}),
  };
}
function renderUpload(tasks: UploadTask[]) {
  const onClose = cy.stub().as('close');
  const onRetry = cy.stub().as('retry');
  mount(<UploadPanel tasks={tasks} onClose={onClose} onRetry={onRetry} />);
}

describe('UploadPanel: React component', () => {
  it('shows progress and hides close while upload is active', () => {
    renderUpload([task('uploading')]);
    cy.contains('Uploading files').should('be.visible');
    cy.get('[data-slot="progress"]').should('exist');
    cy.get('[aria-label="Close upload panel"]').should('not.exist');
  });
  it('leaves close and retry accessible after upload error', () => {
    renderUpload([task('error')]);
    cy.contains('Some uploads failed').should('be.visible');
    cy.contains('Network error').should('be.visible');
    cy.get('[aria-label="Retry upload of Overview.pdf"]').click();
    cy.get('@retry').should('have.been.calledOnceWith', 'task-1');
    cy.get('[aria-label="Close upload panel"]').click();
    cy.get('@close').should('have.been.calledOnce');
  });
  it('automatically dismisses only an entirely successful batch', () => {
    cy.clock();
    renderUpload([task('done')]);
    cy.contains('Uploads complete').should('be.visible');
    cy.tick(4999);
    cy.get('@close').should('not.have.been.called');
    cy.tick(1);
    cy.get('@close').should('have.been.calledOnce');
  });
  it('does not auto-dismiss a partially failed batch', () => {
    cy.clock();
    renderUpload([task('done', 'task-1'), task('error', 'task-2')]);
    cy.tick(6000);
    cy.get('@close').should('not.have.been.called');
  });
});
