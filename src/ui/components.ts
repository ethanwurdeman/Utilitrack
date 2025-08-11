export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | boolean> = {},
  children: Array<Node | string> = []
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (typeof value === 'boolean') {
      if (value) element.setAttribute(key, '');
    } else {
      element.setAttribute(key, value);
    }
  });
  for (const child of children) {
    element.append(child);
  }
  return element;
}
