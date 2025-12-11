/**
 * Sonic Flow - Immersive Music Experience
 * Logic: Particles, 3D Tilt, Spotify API Integration, Custom Login Flow
 */

class SonicFlow {
    constructor() {
        const canonicalPath = window.location.pathname.replace(/index\.html$/, '');
        this.config = {
            clientId: 'faf59564cd624852ba338d75c41810b5',
            playlistId: '3bvrnjeg4FHWy4mbvNvf4q',
            redirectUri: `${window.location.origin}${canonicalPath}`,
            scopes: 'user-read-private user-read-email playlist-read-private'
        };

        // Debug: Log the Redirect URI for the user to add to Spotify Dashboard
        console.log('Configuration Redirect URI:', this.config.redirectUri);

        this.state = {
            token: null,
            playlist: [],
            currentIndex: -1,
            isPlaying: false,
            audio: new Audio(),
            volume: 0.7
        };

        this.elements = {
            // Login Elements
            loginOverlay: document.getElementById('loginOverlay'),
            enterBtn: document.getElementById('enterBtn'),
            loginLoader: document.getElementById('loginLoader'),
            mainInterface: document.getElementById('mainInterface'),

            // Player Elements
            userProfile: document.getElementById('userProfile'),
            userAvatar: document.getElementById('userAvatar'),
            userName: document.getElementById('userName'),
            tiltCard: document.getElementById('tiltCard'),
            albumArt: document.getElementById('mainAlbumArt'),
            trackTitle: document.getElementById('mainTitle'),
            trackArtist: document.getElementById('mainArtist'),
            playBtn: document.getElementById('playPauseBtn'),
            playIcon: document.querySelector('.play-icon i'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            progressBar: document.getElementById('progressBar'),
            progressFill: document.getElementById('progressFill'),
            timeTooltip: document.getElementById('timeTooltip'),
            playlistTrigger: document.getElementById('playlistTrigger'),
            playlistDrawer: document.getElementById('playlistDrawer'),
            closeDrawer: document.getElementById('closeDrawer'),
            trackList: document.getElementById('trackList'),
            toast: document.getElementById('toast'),
            volumeSlider: document.getElementById('volumeBar'),
            volumeLevel: document.getElementById('volumeFill')
        };

        this.init();
    }

    init() {
        this.initParticles();
        this.initTiltEffect();
        this.setupEventListeners();

        // Check for cached token or hash
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const authError = params.get('error');

        if (accessToken) {
            this.handleAuth(params);
        } else if (authError) {
            this.resetLoginUi();
            this.showToast('Login was cancelled or failed. Please try again.', true);
            window.location.hash = '';
        } else {
            const storedToken = localStorage.getItem('spotify_token');
            const storedExpiry = localStorage.getItem('spotify_token_expiry');

            if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
                this.state.token = storedToken;
                this.onLoginSuccess();
            } else {
                this.resetLoginUi();
            }
        }
    }

    // --- Visual Effects ---

    initParticles() {
        const canvas = document.getElementById('particlesCanvas');
        const ctx = canvas.getContext('2d');
        let particles = [];

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
                this.life = Math.random() * 100;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.life--;

                if (this.life < 0 || this.x > canvas.width || this.x < 0 || this.y > canvas.height || this.y < 0) {
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

        for (let i = 0; i < 150; i++) particles.push(new Particle());

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        };
        animate();
    }

    initTiltEffect() {
        const card = this.elements.tiltCard;
        document.addEventListener('mousemove', (e) => {
            if (this.elements.mainInterface.classList.contains('hidden')) return;

            const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
            card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
        });
    }

    // --- Auth & Login Flow ---

    handleAuth(params) {
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');

        if (accessToken) {
            this.state.token = accessToken;
            const expiryTime = Date.now() + (parseInt(expiresIn) * 1000);
            localStorage.setItem('spotify_token', accessToken);
            localStorage.setItem('spotify_token_expiry', expiryTime);
            window.location.hash = '';
            this.onLoginSuccess();
        } else {
            this.resetLoginUi();
            this.showToast('No token returned. Check your Redirect URI.', true);
        }
    }

    startLoginFlow() {
        // 1. Hide Button
        this.elements.enterBtn.style.display = 'none';

        // 2. Show Loader
        this.elements.loginLoader.classList.remove('hidden');

        // 3. Fake Delay for "System Check"
        setTimeout(() => {
            this.login();
        }, 2000);
    }

    login() {
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${this.config.clientId}&response_type=token&redirect_uri=${encodeURIComponent(this.config.redirectUri)}&scope=${encodeURIComponent(this.config.scopes)}&show_dialog=true`;
        window.location.href = authUrl;
    }

    async onLoginSuccess() {
        // Transition UI
        this.elements.loginOverlay.classList.add('fade-out');
        setTimeout(() => {
            this.elements.mainInterface.classList.remove('hidden');
        }, 500);

        try {
            await this.fetchUserProfile();
            await this.fetchPlaylist();
            this.showToast('Welcome to Sonic Flow');
        } catch (error) {
            console.error(error);
            this.showToast('Connection failed', true);
            this.resetLoginUi();
        }
    }

    resetLoginUi() {
        // Ensure the overlay is visible and the button usable after failures
        this.elements.loginOverlay.classList.remove('fade-out');
        this.elements.mainInterface.classList.add('hidden');
        this.elements.enterBtn.style.display = 'inline-flex';
        this.elements.loginLoader.classList.add('hidden');
    }

    async fetchUserProfile() {
        const data = await this.spotifyRequest('https://api.spotify.com/v1/me');
        this.elements.userName.textContent = data.display_name;
        if (data.images?.[0]?.url) this.elements.userAvatar.src = data.images[0].url;
    }

    async fetchPlaylist() {
        const data = await this.spotifyRequest(`https://api.spotify.com/v1/playlists/${this.config.playlistId}`);
        this.state.playlist = data.tracks.items
            .filter(item => item.track.preview_url)
            .map(item => ({
                id: item.track.id,
                title: item.track.name,
                artist: item.track.artists.map(a => a.name).join(', '),
                cover: item.track.album.images[0]?.url,
                previewUrl: item.track.preview_url
            }));

        if (this.state.playlist.length === 0) {
            this.showToast('No previews available in this playlist', true);
        } else {
            this.renderPlaylist();
            // Load first track without playing
            this.loadTrack(0);
        }
    }

    async spotifyRequest(url) {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.state.token}` }
        });
        if (response.status === 401) {
            localStorage.removeItem('spotify_token');
            window.location.reload();
        }
        return response.json();
    }

    // --- Player Logic ---

    renderPlaylist() {
        this.elements.trackList.innerHTML = '';
        this.state.playlist.forEach((track, index) => {
            const div = document.createElement('div');
            div.className = 'track-item';
            div.innerHTML = `
                <img src="${track.cover}" alt="art">
                <div class="track-meta">
                    <h4>${track.title}</h4>
                    <p>${track.artist}</p>
                </div>
            `;
            div.onclick = () => this.playTrack(index);
            this.elements.trackList.appendChild(div);
        });
    }

    loadTrack(index) {
        if (index < 0 || index >= this.state.playlist.length) return;
        const track = this.state.playlist[index];
        this.state.currentIndex = index;

        this.elements.trackTitle.textContent = track.title;
        this.elements.trackArtist.textContent = track.artist;
        this.elements.albumArt.src = track.cover;
        this.state.audio.src = track.previewUrl;

        // Update active state in drawer
        document.querySelectorAll('.track-item').forEach((el, i) => {
            el.classList.toggle('active', i === index);
        });
    }

    playTrack(index) {
        this.loadTrack(index);
        this.togglePlay(true);
    }

    togglePlay(forcePlay = null) {
        if (this.state.currentIndex === -1 && this.state.playlist.length > 0) {
            this.loadTrack(0);
        }

        const shouldPlay = forcePlay !== null ? forcePlay : !this.state.isPlaying;

        if (shouldPlay) {
            this.state.audio.play().catch(e => console.error(e));
            this.state.isPlaying = true;
            this.elements.playIcon.className = 'fas fa-pause';
            this.elements.albumArt.style.transform = 'scale(1.05)';
        } else {
            this.state.audio.pause();
            this.state.isPlaying = false;
            this.elements.playIcon.className = 'fas fa-play';
            this.elements.albumArt.style.transform = 'scale(1)';
        }
    }

    setupEventListeners() {
        this.elements.enterBtn.onclick = () => this.startLoginFlow();
        this.elements.playBtn.onclick = () => this.togglePlay();

        this.elements.prevBtn.onclick = () => {
            let newIndex = this.state.currentIndex - 1;
            if (newIndex < 0) newIndex = this.state.playlist.length - 1;
            this.playTrack(newIndex);
        };

        this.elements.nextBtn.onclick = () => {
            let newIndex = this.state.currentIndex + 1;
            if (newIndex >= this.state.playlist.length) newIndex = 0;
            this.playTrack(newIndex);
        };

        // Audio Events
        this.state.audio.ontimeupdate = () => {
            const progress = (this.state.audio.currentTime / this.state.audio.duration) * 100;
            this.elements.progressFill.style.width = `${progress}%`;
        };

        this.state.audio.onended = () => this.elements.nextBtn.click();

        // Progress Bar Interaction
        this.elements.progressBar.onclick = (e) => {
            const rect = this.elements.progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.state.audio.currentTime = percent * this.state.audio.duration;
        };

        this.elements.progressBar.onmousemove = (e) => {
            const rect = this.elements.progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const time = percent * 30; // Preview is 30s
            this.elements.timeTooltip.textContent = `0:${Math.floor(time).toString().padStart(2, '0')}`;
            this.elements.timeTooltip.style.left = `${percent * 100}%`;
        };

        // Volume
        this.elements.volumeSlider.onclick = (e) => {
            const rect = this.elements.volumeSlider.getBoundingClientRect();
            const percent = 1 - (e.clientY - rect.top) / rect.height;
            this.state.volume = Math.max(0, Math.min(1, percent));
            this.state.audio.volume = this.state.volume;
            this.elements.volumeLevel.style.height = `${this.state.volume * 100}%`;
        };

        // Drawer
        this.elements.playlistTrigger.onclick = () => {
            this.elements.playlistDrawer.classList.add('open');
        };
        this.elements.closeDrawer.onclick = () => {
            this.elements.playlistDrawer.classList.remove('open');
        };
    }

    showToast(msg, isError = false) {
        const toast = this.elements.toast;
        toast.textContent = msg;
        toast.style.background = isError ? '#ff4444' : 'white';
        toast.style.color = isError ? 'white' : 'black';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SonicFlow();
});pus