import type { UserRole } from '../auth';
import { el } from '../ui/components';

export default function config(_role: UserRole | null): HTMLElement {
  return el('div', {}, [el('h2', {}, ['Config'])]);
}
