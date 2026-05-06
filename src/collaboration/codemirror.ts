import { yCollab } from 'y-codemirror.next';
import type * as Y from 'yjs';

export function createYjsCodeMirrorExtension(
  ytext: Y.Text,
  awareness: unknown,
  undoManager?: Y.UndoManager,
) {
  return yCollab(ytext, awareness, { undoManager: undoManager ?? false });
}
