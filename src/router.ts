import type { UserRole } from './auth';

interface Route {
  path: string;
  load: () => Promise<{ default: (role: UserRole | null) => HTMLElement }>;
}

const routes: Route[] = [
  { path: '#/dashboard', load: () => import('./pages/dashboard') },
  { path: '#/map', load: () => import('./pages/map') },
  { path: '#/users', load: () => import('./pages/users') },
  { path: '#/config', load: () => import('./pages/config') },
  { path: '#/news', load: () => import('./pages/news') }
];

export async function router(role: UserRole | null) {
  const match = routes.find((r) => r.path === location.hash) ?? routes[0];
  const module = await match.load();
  const view = module.default(role);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = '';
    app.appendChild(view);
  }
}
