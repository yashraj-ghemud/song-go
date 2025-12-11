/**
 * Sonic Flow Access Portal
 * Dedicated authentication landing page for Spotify login.
 */

class SpotifyAccessPortal {
    constructor() {
        const basePath = window.location.pathname.replace(/auth\.html$/, '');
        this.paths = {
            player: `${window.location.origin}${basePath}index.html`
        };

        this.config = {
            clientId: 'faf59564cd624852ba338d75c41810b5',
            redirectUri: this.paths.player,
            scopes: 'user-read-private user-read-email playlist-read-private'
        };

        this.elements = {
            enterBtn: document.getElementById('enterBtn'),
            loginLoader: document.getElementById('loginLoader'),
            redirectHint: document.getElementById('redirectUriHint'),
            sessionHint: document.getElementById('sessionHint'),
            toast: document.getElementById('toast')
        };

        this.init();
    }

    init() {
        this.initParticles();
        this.updateRedirectHint();
        this.setupEventHandlers();
        this.checkExistingSession();
        this.inspectHashForErrors();
    }

    initParticles() {
        const canvas = document.getElementById('particlesCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const particles = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2;
                this.speedX = Math.random() * 0.5 - 0.25;
                this.speedY = Math.random() * 0.5 - 0.25;
                this.opacity = Math.random() * 0.5;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x > canvas.width || this.x < 0 || this.y > canvas.height || this.y < 0) {
                    this.reset();
                }
            }
            draw() {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < 120; i++) particles.push(new Particle());

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((particle) => {
                particle.update();
                particle.draw();
            });
            requestAnimationFrame(animate);
        };

        animate();
    }

    updateRedirectHint() {
        if (this.elements.redirectHint) {
            this.elements.redirectHint.textContent = this.config.redirectUri;
        }
    }

    setupEventHandlers() {
        this.elements.enterBtn.addEventListener('click', () => this.handlePrimaryAction());
    }

    handlePrimaryAction() {
        if (this.elements.enterBtn.dataset.action === 'launch') {
            window.location.href = this.paths.player;
            return;
        }
        this.startLoginFlow();
    }

    startLoginFlow() {
        this.elements.enterBtn.style.display = 'none';
        this.elements.loginLoader.classList.remove('hidden');
        setTimeout(() => this.login(), 1200);
    }

    login() {
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${this.config.clientId}` +
            `&response_type=token` +
            `&redirect_uri=${encodeURIComponent(this.config.redirectUri)}` +
            `&scope=${encodeURIComponent(this.config.scopes)}` +
            `&show_dialog=true`;
        window.location.href = authUrl;
    }

    checkExistingSession() {
        const storedToken = localStorage.getItem('spotify_token');
        const storedExpiry = localStorage.getItem('spotify_token_expiry');
        if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry, 10)) {
            this.elements.sessionHint.textContent = 'Active Spotify session found. Launch the Sonic Flow player directly.';
            this.elements.enterBtn.dataset.action = 'launch';
            this.elements.enterBtn.querySelector('span').textContent = 'Launch Sonic Flow';
        } else {
            this.elements.sessionHint.textContent = 'No active session detected. Authenticate to continue.';
        }
    }

    inspectHashForErrors() {
        const hash = window.location.hash.substring(1);
        if (!hash) return;
        const params = new URLSearchParams(hash);
        const error = params.get('error');
        if (error) {
            this.showToast(`Spotify reported: ${error}`, true);
            window.location.hash = '';
        }
    }

    showToast(message, isError = false) {
        if (!this.elements.toast) return;
        const toast = this.elements.toast;
        toast.textContent = message;
        toast.style.background = isError ? '#ff4444' : 'white';
        toast.style.color = isError ? 'white' : 'black';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.authPortal = new SpotifyAccessPortal();
});
