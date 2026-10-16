/** Investigation-only component repro. PASS = problematic behavior reproduced.
 * Run only with make qa-investigate-ui. No remote network request is sent.
 */
import { mount } from 'cypress/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteFolderDialog } from '../../src/features/data-room/components/delete-folder-dialog';

it('QA-NEW-02: Delete remains enabled when subtree preview returns HTTP 503', () => {
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  cy.intercept('GET', '**/folders/*/delete-preview', {
    statusCode:503, body:{message:'QA injected preview error'},
  }).as('previewFailure');
  const onOpenChange = cy.stub().as('onOpenChange');
  mount(
    <QueryClientProvider client={client}>
      <DeleteFolderDialog
        folder={{type:'folder',id:'00000000-0000-4000-8000-000000000002',name:'QA target',parentId:null,createdAt:new Date().toISOString()}}
        dataRoomId="00000000-0000-4000-8000-000000000001"
        listingFolderId={null}
        open={true}
        onOpenChange={onOpenChange}
      />
    </QueryClientProvider>
  );
  cy.wait('@previewFailure');
  cy.contains("Could not check what's inside this folder.").should('be.visible');
  // Observed unsafe behavior — do NOT confuse this with expected acceptance.
  cy.get('[role="dialog"]').contains('button','Delete').should('be.enabled');
});
