import type { UserRole } from '../auth';
import { el } from '../ui/components';

export default function users(_role: UserRole | null): HTMLElement {
  return el('div', {}, [el('h2', {}, ['Users'])]);
}
