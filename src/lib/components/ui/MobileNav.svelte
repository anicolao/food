<script lang="ts">
    import { base } from '$app/paths';
    import NavItem from './NavItem.svelte';

    // Simple Icon component placeholders or inline svgs
</script>

<nav class="mobile-nav glass-panel">
    <div class="nav-group">
        <NavItem href="{base}/" label="Home" active={true}>
            {#snippet icon()}
            <!-- Home Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            {/snippet}
        </NavItem>
    </div>

    <div class="fab-container">
        <a href="{base}/log" class="fab" aria-label="Log new food entry">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </a>
    </div>

    <div class="nav-group">
        <NavItem href="{base}/settings" label="Settings">
            {#snippet icon()}
            <!-- Settings/User Icon -->
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            {/snippet}
        </NavItem>
    </div>
</nav>

<style>
    .mobile-nav {
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        height: 70px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 40px;
        z-index: 100;
        /* Custom glass panel override */
        border-radius: 35px; /* Pill shape */
        border: 1px solid rgba(255,255,255,0.1);
    }

    .fab-container {
        position: relative;
        top: -25px; 
    }

    .fab {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: var(--gradient-calories);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 10px 20px rgba(255, 94, 98, 0.4);
        transition: transform 0.2s, box-shadow 0.2s;
        border: 4px solid var(--bg-app); /* visual gap */
    }

    .fab:active {
        transform: scale(0.95);
        box-shadow: 0 5px 10px rgba(255, 94, 98, 0.4);
    }

    .nav-group {
        display: flex;
        gap: 20px;
    }
</style>
