<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	import MobileNav from '$lib/components/ui/MobileNav.svelte';
	import DesktopSidebar from '$lib/components/ui/DesktopSidebar.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import PageTransitionWrapper from '$lib/components/ui/PageTransitionWrapper.svelte';
	import { page } from '$app/stores';
	import { getTransitionDirection, getTransitionParams } from '$lib/transitions';
	import { onMount } from 'svelte';
    import { initializeAuth } from '$lib/auth';
    import { afterNavigate, beforeNavigate } from '$app/navigation';
    import { getAllEvents } from '$lib/db';
    import { syncManager } from '$lib/sync-manager';
    import { store, ingestSyncedEvent } from '$lib/store';

	let { children } = $props();

	let width = $state(0);
	let height = $state(0);
	let reducedMotion = $state(false);
	let transitionsEnabled = $state(false);

	// Track navigation history for direction calculation
	let previousUrl: URL | null = null; 

    onMount(async () => {
        // Initialize previousUrl with current url so first navigation works
        previousUrl = new URL($page.url.href);
        initializeAuth(() => { console.log('[Auth] Initialized in Layout'); });
        
        // Offline Support Initialization
        try {
            console.log('[Layout] Hydrating from DB...');
            const events = await getAllEvents();
            console.log(`[Layout] Found ${events.length} events in DB.`);
            
            // Batch hydrate? Or individually?
            // Store's ingestSyncedEvent handles one by one.
            // For 1000s of events, this might be slow to dispatch individually.
            // But for MVP, let's just loop.
            // NOTE: We should sort by timestamp first? `getAllEvents` already sorts by timestamp index.
            for (const event of events) {
                 store.dispatch(ingestSyncedEvent(event) as any);
            }
            
            console.log('[Layout] Hydration complete.');
            
            // Kick off sync manager (it checks online status itself)
            // Just access it to ensure it's imported? No, we have explicit sync call in network status and middleware.
            // But we might want to auto-sync on load if online?
            syncManager.sync();
            
        } catch (e) {
            console.error('[Layout] Failed to initialize offline support', e);
        }

		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mediaQuery.matches;
		transitionsEnabled = true;
	});

    // Handle history updates for direction calculation    // Handle history updates for direction calculation
    import { transitionSnapshots } from '$lib/transitions';

    beforeNavigate(() => {
        // Snapshot the current page content before it updates
        const currentPath = $page.url.pathname;
        const wrapperId = 'ptw-' + currentPath.replace(/[^a-zA-Z0-9-]/g, '_');
        const element = document.getElementById(wrapperId);
        if (element) {
            transitionSnapshots.update(s => ({ ...s, [currentPath]: element.innerHTML }));
        }
    });

    afterNavigate((nav) => {
        if (nav.to) {
            previousUrl = new URL(nav.to.url.href);
            // Clear the snapshot for the NEW page so it renders live content
            const newPath = nav.to.url.pathname;
            transitionSnapshots.update(s => {
                const { [newPath]: _, ...rest } = s;
                return rest;
            });
        }
    });

</script>



<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<div class="desktop-nav">
		<DesktopSidebar />
	</div>
	
	<div class="main-content">
		{#if reducedMotion || !transitionsEnabled}
			<div class="transition-wrapper">
				{@render children()}
			</div>
		{:else}
			{#key $page.url.pathname}
				{@const direction = previousUrl ? getTransitionDirection(previousUrl, $page.url) : 'crossfade'}
				{@const config = getTransitionParams(direction, width, height)}

				<div 
					class="transition-wrapper"
					in:config.in={config.inParams}
					out:config.out={config.outParams}
				>
					<PageTransitionWrapper {children} pageKey={$page.url.pathname} />
				</div>
			{/key}
		{/if}
	</div>

	<div class="mobile-nav-wrapper">
		<MobileNav />
	</div>

    <ToastContainer />
</div>

<style>
	.app-shell {
		display: flex;
		min-height: 100vh;
	}

	.desktop-nav {
		display: none;
	}

	.mobile-nav-wrapper {
		display: block;
	}

	.main-content {
		flex: 1;
		padding-bottom: 100px; /* Space for mobile nav */
		width: 100%;
		max-width: 100%;
		
		/* Grid Stacking for Transitions */
		display: grid;
		grid-template-areas: "content";
		overflow-x: hidden; /* Prevent horizontal scrollbar during slide */
	}

	.transition-wrapper {
		grid-area: content;
		width: 100%;
		/* Ensure wrapper takes full height/width of the cell */
	}

	@media (min-width: 1024px) {
		.desktop-nav {
			display: block;
			width: 280px; /* Match sidebar width */
			flex-shrink: 0;
		}

		.mobile-nav-wrapper {
			display: none;
		}

		.main-content {
			padding-bottom: 0;
		}
	}
</style>
