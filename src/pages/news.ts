import type { UserRole } from '../auth';
import { el } from '../ui/components';

export default function news(_role: UserRole | null): HTMLElement {
  return el('div', {}, [el('h2', {}, ['News'])]);
}
