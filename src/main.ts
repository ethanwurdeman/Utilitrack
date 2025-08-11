import './styles.css';
import { register, login, logout, watchAuth, UserRole } from './auth';
import { router } from './router';

const authSection = document.getElementById('auth-section') as HTMLElement;
const nav = document.getElementById('nav') as HTMLElement;
const authForm = document.getElementById('auth-form') as HTMLFormElement;
const emailEl = document.getElementById('email') as HTMLInputElement;
const passwordEl = document.getElementById('password') as HTMLInputElement;
const registerBtn = document.getElementById('register-btn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;

let role: UserRole | null = null;

watchAuth((user, userRole) => {
  role = userRole;
  if (user) {
    authSection.hidden = true;
    nav.hidden = false;
    router(role);
  } else {
    authSection.hidden = false;
    nav.hidden = true;
    const app = document.getElementById('app');
    if (app) app.innerHTML = '';
  }
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await login(emailEl.value, passwordEl.value);
});

registerBtn.addEventListener('click', async () => {
  await register(emailEl.value, passwordEl.value);
});

logoutBtn.addEventListener('click', () => logout());

nav.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const route = target.getAttribute('data-route');
  if (route) {
    location.hash = route;
  }
});

window.addEventListener('hashchange', () => router(role));
