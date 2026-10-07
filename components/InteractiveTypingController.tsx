import React, { useEffect } from 'react';
import { StoreSettings, SiteNumeralSystem, convertDigitsToSystem } from '../types';

export const LUXURY_TYPING_PALETTE = [
  {
    name: 'أزرق أبل الهادئ',
    main: '#0071E3',
    secondary: '#0077ED',
    glow: 'rgba(0, 113, 227, 0.14)',
  },
  {
    name: 'ذهبي دافئ',
    main: '#C49746',
    secondary: '#D97706',
    glow: 'rgba(196, 151, 70, 0.15)',
  },
  {
    name: 'زمردي ناعم',
    main: '#059669',
    secondary: '#10B981',
    glow: 'rgba(5, 150, 105, 0.14)',
  },
  {
    name: 'بنفسجي هادئ',
    main: '#6D28D9',
    secondary: '#7C3AED',
    glow: 'rgba(109, 40, 217, 0.14)',
  },
];

// Global reference to original Number.prototype.toLocaleString
const ORIGINAL_NUM_TO_LOCALE =
  typeof Number !== 'undefined' ? Number.prototype.toLocaleString : null;

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'TEXTAREA',
  'INPUT',
  'NOSCRIPT',
  'CODE',
]);

function normalizeTextNodesInSubtree(root: Node, mode: SiteNumeralSystem) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    const parent = root.parentElement;
    if (!parent || SKIP_TAGS.has(parent.tagName)) return;
    if (parent.closest('[data-keep-numerals="true"]')) return;
    const val = root.nodeValue;
    if (!val) return;
    const hasTarget = mode === 'en' ? /[٠-٩۰-۹٬٫]/.test(val) : /[0-9]/.test(val);
    if (!hasTarget) return;
    const next = convertDigitsToSystem(val, mode);
    if (next !== val) {
      root.nodeValue = next;
    }
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    return;
  }

  const el = root as Element;
  if (el.tagName && SKIP_TAGS.has(el.tagName)) return;
  if (el.closest && el.closest('[data-keep-numerals="true"]')) return;

  // Fast pre-check on textContent before creating a TreeWalker
  const rawText = el.textContent;
  if (!rawText) return;
  const subtreeHasTarget = mode === 'en' ? /[٠-٩۰-۹٬٫]/.test(rawText) : /[0-9]/.test(rawText);
  if (!subtreeHasTarget) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let current = walker.nextNode();
  while (current) {
    const parent = current.parentElement;
    if (
      parent &&
      !SKIP_TAGS.has(parent.tagName) &&
      !parent.closest('[data-keep-numerals="true"]')
    ) {
      const val = current.nodeValue;
      if (val) {
        const hasTarget = mode === 'en' ? /[٠-٩۰-۹٬٫]/.test(val) : /[0-9]/.test(val);
        if (hasTarget) {
          const next = convertDigitsToSystem(val, mode);
          if (next !== val) {
            current.nodeValue = next;
          }
        }
      }
    }
    current = walker.nextNode();
  }
}

interface InteractiveTypingControllerProps {
  settings: StoreSettings;
}

/**
 * Site-Wide Numeral Language Controller ('ar' = ٠١٢٣٤٥٦٧٨٩ | 'en' = 0123456789)
 * Applies numeral conversion cleanly across the entire DOM without blocking keystrokes.
 */
export const InteractiveTypingController: React.FC<InteractiveTypingControllerProps> = ({
  settings,
}) => {
  const numeralSystem: SiteNumeralSystem = settings.siteNumeralSystem || 'en';

  useEffect(() => {
    if (typeof window === 'undefined' || !ORIGINAL_NUM_TO_LOCALE) return;

    // 1. Override Number.prototype.toLocaleString so future React renders format numbers in the chosen language
    // eslint-disable-next-line no-extend-native
    Number.prototype.toLocaleString = function (
      locales?: string | string[],
      options?: Intl.NumberFormatOptions
    ): string {
      const targetLocale =
        numeralSystem === 'ar' ? 'ar-EG-u-nu-arab' : 'en-US';
      try {
        return ORIGINAL_NUM_TO_LOCALE.call(this, targetLocale, options);
      } catch {
        return ORIGINAL_NUM_TO_LOCALE.call(this, locales, options);
      }
    };

    document.documentElement.setAttribute('data-numeral-system', numeralSystem);

    // 2. Convert existing DOM text nodes immediately
    normalizeTextNodesInSubtree(document.body, numeralSystem);

    // 3. Observe new DOM mutations in a single batched rAF per frame
    let rafId: number | null = null;
    const pendingNodes = new Set<Node>();

    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === 'characterData') {
          pendingNodes.add(m.target);
        } else if (m.type === 'childList' && m.addedNodes.length > 0) {
          for (let j = 0; j < m.addedNodes.length; j++) {
            pendingNodes.add(m.addedNodes[j]);
          }
        }
      }
      if (pendingNodes.size > 0 && rafId === null) {
        rafId = window.requestAnimationFrame(() => {
          rafId = null;
          pendingNodes.forEach((node) => {
            normalizeTextNodesInSubtree(node, numeralSystem);
          });
          pendingNodes.clear();
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [numeralSystem]);

  return null;
};

export default InteractiveTypingController;
