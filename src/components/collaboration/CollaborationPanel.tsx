import { Circle, Users } from 'lucide-react';
import type { PresenceUser } from '../../collaboration/awareness';

type CollaborationPanelProps = {
  roomId: string;
  status: string;
  user: PresenceUser;
};

export function CollaborationPanel({ roomId, status, user }: CollaborationPanelProps) {
  return (
    <section className="collaboration-panel" aria-label="Collaboration">
      <div className="panel-title">Collaboration</div>
      <div className="collaboration-body">
        <div className="collaboration-room">
          <Users size={14} aria-hidden="true" />
          <span>{roomId}</span>
        </div>
        <div className="presence-row">
          <span className="presence-dot" style={{ backgroundColor: user.color }} />
          <span>{user.name}</span>
          <span className="collaboration-status">
            <Circle size={9} aria-hidden="true" />
            {status}
          </span>
        </div>
      </div>
    </section>
  );
}
