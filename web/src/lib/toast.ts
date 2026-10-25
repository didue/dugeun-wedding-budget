type Toast = { id: number; text: string };

let items: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function toast(text: string) {
  const id = ++seq;
  items = [...items, { id, text }];
  emit();
  window.setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 2500);
}

export const toastStore = {
  get: () => items,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
