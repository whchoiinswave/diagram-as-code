import { HocuspocusProvider } from '@hocuspocus/provider';
import type * as Y from 'yjs';

export type CollaborationProviderOptions = {
  url: string;
  roomId: string;
  document: Y.Doc;
};

export function createCollaborationProvider({
  url,
  roomId,
  document,
}: CollaborationProviderOptions): HocuspocusProvider {
  return new HocuspocusProvider({
    url,
    name: roomId,
    document,
  });
}
