export type PresenceUser = {
  id: string;
  name: string;
  color: string;
};

const palette = ['#148f77', '#315f8f', '#b7791f', '#8a4fbf', '#c24135'];

export function createPresenceUser(name: string, id: string = crypto.randomUUID()): PresenceUser {
  const color = palette[Math.abs(hashCode(id)) % palette.length];
  return { id, name, color };
}

function hashCode(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return hash;
}
