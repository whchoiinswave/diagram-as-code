import type { LaunchContext } from '../diagram/types';
import { createRoomId } from '../app/launch/launch-context';

export function resolveRoomId(context: LaunchContext): string {
  return context.roomId ?? createRoomId(context);
}

export function isCollaborationMode(context: LaunchContext): boolean {
  return context.mode === 'collaboration';
}
