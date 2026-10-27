import { h } from '../ui/dom.js';

export function render(root) {
  root.append(h('p', { class: 'center muted' }, '…'));
}
