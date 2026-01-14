import { fly, fade, type FlyParams, type FadeParams } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';

type Direction = 'left' | 'right' | 'up' | 'down' | 'crossfade';

export type TransitionConfig = {
    in: (node: Element, params: any) => import('svelte/transition').TransitionConfig;
    out: (node: Element, params: any) => import('svelte/transition').TransitionConfig;
    inParams: FlyParams | FadeParams;
    outParams: FlyParams | FadeParams;
};

// Priority Heuristic
export function getTransitionDirection(from: URL, to: URL): Direction {
    const fromPath = from.pathname.replace(/\/$/, '') || '/';
    const toPath = to.pathname.replace(/\/$/, '') || '/';

    // 1. Vertical overrides (Logging) - HIGHEST PRIORITY
    // Going TO Log -> Always Slide UP (Enter Bottom)
    if (toPath.includes('/log')) return 'up';
    // Leaving Log -> Always Slide DOWN (Enter Top)
    if (fromPath.includes('/log')) return 'down';

    // 2. Global Target Rules
    // To Settings -> Always Enter Right
    if (toPath === '/settings') return 'right';

    // To Main -> Always Enter Left
    if (toPath === '/') return 'left';

    // To Entry -> Drill Down (Enter Right)
    if (toPath.includes('/entry')) return 'right';

    // Default: Crossfade
    return 'crossfade';
}

export function getTransitionParams(direction: Direction, width: number, height: number): TransitionConfig {
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 0 : 300;
    const easing = cubicOut;

    // Fallbacks for initial render (avoid fly(0))
    const w = width || (typeof window !== 'undefined' ? window.innerWidth : 100);
    const h = height || (typeof window !== 'undefined' ? window.innerHeight : 100);

    switch (direction) {
        case 'up':
            return {
                in: fly,
                out: fly,
                inParams: { y: h, duration, easing },
                outParams: { y: -h, duration, easing }
            };
        case 'down':
            return {
                in: fly,
                out: fly,
                inParams: { y: -h, duration, easing },
                outParams: { y: h, duration, easing }
            };
        case 'right':
            return {
                in: fly,
                out: fly,
                inParams: { x: w, duration, easing },
                outParams: { x: -w, duration, easing }
            };
        case 'left':
            return {
                in: fly,
                out: fly,
                inParams: { x: -w, duration, easing },
                outParams: { x: w, duration, easing }
            };
        case 'crossfade':
        default:
            return {
                in: fade,
                out: fade,
                inParams: { duration: 200, easing },
                outParams: { duration: 200, easing }
            };
    }
}
