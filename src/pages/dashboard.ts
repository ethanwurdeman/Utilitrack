import type { UserRole } from '../auth';
import { el } from '../ui/components';

export default function dashboard(role: UserRole | null): HTMLElement {
  return el('div', {}, [
    el('h2', {}, ['Dashboard']),
    el('p', {}, [`Role: ${role ?? 'unknown'}`])
  ]);
}
