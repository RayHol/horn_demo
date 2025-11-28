(function() {
    'use strict';

    function initStarburstBackground() {
        if (document.getElementById('starburst-background')) {
            return;
        }

        const style = document.createElement('style');
        style.textContent = `
            .starburst-background {
                position: fixed;
                top: 50%;
                left: 50%;
                width: 150vw;
                height: 150vh;
                min-width: 1200px;
                min-height: 1200px;
                pointer-events: none;
                z-index: 0;
                transform: translate(-50%, -50%);
                transform-origin: 50% 41.13%;
                animation: rotateStarburst 60s linear infinite;
                opacity: 1;
            }

            .starburst-background img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                display: block;
            }

            @keyframes rotateStarburst {
                from {
                    transform: translate(-50%, -50%) rotate(0deg);
                }
                to {
                    transform: translate(-50%, -50%) rotate(360deg);
                }
            }
        `;
        document.head.appendChild(style);

        const starburstDiv = document.createElement('div');
        starburstDiv.id = 'starburst-background';
        starburstDiv.className = 'starburst-background';
        starburstDiv.innerHTML = '<img src="./assets/Startburst.svg" alt="Starburst background">';
        document.body.appendChild(starburstDiv);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStarburstBackground);
    } else {
        initStarburstBackground();
    }
})();

