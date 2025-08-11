import './styles.css';
import { register, login, logout, UserRole } from './auth';
import { router } from './router';
import { watchAuth } from "./auth";

const authSection = document.getElementById('auth-section') as HTMLElement;
const nav = document.getElementById('nav') as HTMLElement;
const authForm = document.getElementById('auth-form') as HTMLFormElement;
const emailEl = document.getElementById('email') as HTMLInputElement;
const passwordEl = document.getElementById('password') as HTMLInputElement;
const registerBtn = document.getElementById('register-btn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;

let role: UserRole | null = null;

function getWhoEl(): HTMLElement {
  let el = document.getElementById("whoami") as HTMLElement | null;
  if (!el) {
    const header = document.getElementById("app-header") ?? document.body;
    el = document.createElement("div");
    el.id = "whoami";
    el.style.font = "14px system-ui";
    header.prepend(el);
  }
  return el;
}

watchAuth((user, role) => {
  const who = getWhoEl();
  const nav = document.getElementById("nav")!;
  const authSection = document.getElementById("auth-section")!;

  if (!user) {
    who.textContent = "";
    nav.hidden = true;
    authSection.hidden = false;
    return;
  }
  who.textContent = `Signed in: ${user.email ?? user.uid} (${role ?? "viewer"})`;
  nav.hidden = false;
  authSection.hidden = true;
});

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
