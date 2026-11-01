const targets = 'a[href],button,input:not([type="hidden"]),select,textarea,[role="button"],[role="tab"],[tabindex]';
const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

// Favor the same row/column, including cards just beyond the viewport.
export function directionalTarget(items, current, key) {
  const direction = directions[key];
  if (!direction || !current) return null;
  const [x, y] = direction, horizontal = x !== 0;
  const center = r => [r.left + r.width / 2, r.top + r.height / 2];
  const [cx, cy] = center(current);
  let best = null, score = Infinity;
  for (const item of items) {
    const r = item.rect, [rx, ry] = center(r);
    const forward = (rx - cx) * x + (ry - cy) * y;
    if (forward <= 1) continue;
    const overlap = horizontal
      ? Math.min(current.top + current.height, r.top + r.height) - Math.max(current.top, r.top)
      : Math.min(current.left + current.width, r.left + r.width) - Math.max(current.left, r.left);
    const side = horizontal ? Math.abs(ry - cy) : Math.abs(rx - cx);
    const distance = (overlap > 0 ? 0 : 1e9) + forward + side * 2;
    if (distance < score) { best = item; score = distance; }
  }
  return best;
}

export function installDirectionalNavigation(doc = document) {
  const win = doc.defaultView;
  let focused = null, active = false, frame = 0, previousScope = doc;
  const remembered = new WeakMap();
  const visible = el => {
    if (el.closest('[hidden],[inert],[aria-hidden="true"]') || el.matches(':disabled,[aria-disabled="true"]')) return false;
    const r = el.getBoundingClientRect(), style = win.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const scope = () => [...doc.querySelectorAll('[role="dialog"],[aria-modal="true"],[role="listbox"]')].filter(visible).at(-1) || doc;
  const candidates = root => [...root.querySelectorAll(targets)].filter(el =>
    el.tabIndex >= 0 && visible(el) && !el.matches('.local-skip') &&
    (!el.closest('.art-video-player') || el.matches('.art-video-player,[data-directional-control]'))
  );
  const focus = el => {
    if (!el) return;
    focused?.classList.remove('directional-focus');
    focused = el;
    remembered.set(scope(), el);
    el.classList.add('directional-focus');
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  };
  const initial = root => {
    const all = candidates(root);
    const onscreen = all.filter(el => {
      const r = el.getBoundingClientRect();
      return r.bottom > 80 && r.top < win.innerHeight - 40 && r.right > 0 && r.left < win.innerWidth;
    });
    return onscreen.find(el => el.closest('main')) || onscreen[0] || all[0];
  };
  const editing = el => el?.matches('textarea,select,input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])') || el?.isContentEditable || el?.closest('[role="slider"],[role="combobox"],[role="listbox"],[role="menu"]');
  const onKey = event => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const el = doc.activeElement, root = scope();
    // Native text editing, select widgets and the Nartya player's shortcuts keep their keys.
    if (editing(el) || (el?.closest('.art-video-player') && !el.matches('[data-directional-control]') && root === doc)) return;
    if (directions[event.key]) {
      active = true;
      event.preventDefault();
      event.stopImmediatePropagation();
      const all = candidates(root);
      if (!all.includes(el)) { focus(initial(root)); return; }
      const next = directionalTarget(all.filter(item => item !== el).map(item => ({ el: item, rect: item.getBoundingClientRect() })), el.getBoundingClientRect(), event.key);
      focus(next?.el || el);
    } else if (event.key === 'Enter' && candidates(root).includes(el)) {
      // One activation, including custom role=button controls and dialogs with Enter handlers.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) el.click();
    }
  };
  const clear = () => { active = false; focused?.classList.remove('directional-focus'); };
  const onFocus = event => {
    if (!active) return;
    focused?.classList.remove('directional-focus');
    focused = event.target;
    remembered.set(scope(), focused);
    focused.classList.add('directional-focus');
  };
  const observer = new win.MutationObserver(() => {
    if (!active || frame) return;
    frame = win.requestAnimationFrame(() => {
      frame = 0;
      const root = scope();
      if (root !== previousScope || !doc.activeElement || doc.activeElement === doc.body || !visible(doc.activeElement)) {
        const saved = remembered.get(root);
        if (saved?.isConnected && visible(saved)) focus(saved);
        else focus(initial(root));
      }
      previousScope = root;
    });
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  doc.addEventListener('keydown', onKey, true);
  doc.addEventListener('pointerdown', clear, true);
  doc.addEventListener('focusin', onFocus);
  return () => {
    observer.disconnect();
    win.cancelAnimationFrame(frame);
    doc.removeEventListener('keydown', onKey, true);
    doc.removeEventListener('pointerdown', clear, true);
    doc.removeEventListener('focusin', onFocus);
    clear();
  };
}
