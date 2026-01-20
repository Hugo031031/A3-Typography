document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.querySelector('.transition-overlay');

    // 1. PAGE ENTER: Fade out the overlay when page loads
    if (overlay) {
        // Small delay to ensure the browser is ready
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 50); 
    }

    // 2. PAGE EXIT: Intercept Nav Clicks
    const links = document.querySelectorAll('nav a');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            // Only run if it's a link to another page on your site
            if (link.hostname === window.location.hostname) {
                e.preventDefault(); // Stop immediate jump
                
                const targetUrl = link.href;

                // Remove the 'hidden' class to fade the white overlay back in
                if (overlay) overlay.classList.remove('hidden');

                // Wait for the animation (500ms), then go to the new page
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 500);
            }
        });
    });
});