/**
 * Sonic Flow - Player Shell
 * Handles Spotify token management, playlist rendering, and playback.
 */

class SonicFlow {
    constructor() {
        const basePath = window.location.pathname.replace(/index\.html$/, '');
        this.paths = {
            base: basePath,
            auth: `${window.location.origin}${basePath}auth.html`
        };

        this.config = {
            clientId: 'faf59564cd624852ba338d75c41810b5',
            playlistId: '3bvrnjeg4FHWy4mbvNvf4q',
            redirectUri: `${window.location.origin}${basePath}index.html`,
            scopes: 'user-read-private user-read-email playlist-read-private'
        };

        this.state = {
            token: null,
            playlist: [],
            currentIndex: -1,
            isPlaying: false,
            audio: new Audio(),
            volume: 0.7
        };

        this.elements = {
            mainInterface: document.getElementById('mainInterface'),
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
        this.bootstrapAuth();
    }

    bootstrapAuth() {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        
        // Also check query parameters for errors (standard OAuth2 behavior)
        const search = window.location.search.substring(1);
        const searchParams = new URLSearchParams(search);

        const accessToken = hashParams.get('access_token');
        const expiresIn = hashParams.get('expires_in');
        
        // Check both sources for error
        const authError = hashParams.get('error') || searchParams.get('error');

        if (accessToken) {
            this.persistToken(accessToken, expiresIn);
            window.location.hash = '';
            this.onLoginSuccess();
            return;
        }

        if (authError) {
            console.error('Spotify Auth Error:', authError);
            this.showToast(`Login failed: ${authError}`, true);
            // Increased timeout so user can read the error
            setTimeout(() => window.location.href = this.paths.auth, 4000);
            return;
        }

        const storedToken = localStorage.getItem('spotify_token');
        const storedExpiry = localStorage.getItem('spotify_token_expiry');
        if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry, 10)) {
            this.state.token = storedToken;
            this.onLoginSuccess();
        } else {
            this.showToast('Please authenticate via the Access Portal.', true);
            setTimeout(() => window.location.href = this.paths.auth, 1500);
        }
    }

    persistToken(accessToken, expiresIn) {
        this.state.token = accessToken;
        const expiryTime = Date.now() + (parseInt(expiresIn, 10) * 1000);
        localStorage.setItem('spotify_token', accessToken);
        localStorage.setItem('spotify_token_expiry', expiryTime.toString());
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
                if (this.x > canvas.width) this.x = 0;
                if (this.x < 0) this.x = canvas.width;
                if (this.y > canvas.height) this.y = 0;
                if (this.y < 0) this.y = canvas.height;
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
            particles.forEach((p) => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        };
        animate();
    }

    initTiltEffect() {
        const card = this.elements.tiltCard;
        if (!card) return;
        document.addEventListener('mousemove', (e) => {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
            card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
        });
    }

    async onLoginSuccess() {
        try {
            await this.fetchUserProfile();
            await this.fetchPlaylist();
            this.showToast('Connected to Spotify successfully!');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to load Spotify data. Returning to Access Portal.', true);
            setTimeout(() => window.location.href = this.paths.auth, 2000);
        }
    }

    async fetchUserProfile() {
        const data = await this.spotifyRequest('https://api.spotify.com/v1/me');
        this.elements.userName.textContent = data.display_name;
        if (data.images?.[0]?.url) {
            this.elements.userAvatar.src = data.images[0].url;
        }
    }

    async fetchPlaylist() {
        const data = await this.spotifyRequest(`https://api.spotify.com/v1/playlists/${this.config.playlistId}`);
        this.state.playlist = data.tracks.items
            .filter((item) => item.track.preview_url)
            .map((item) => ({
                id: item.track.id,
                title: item.track.name,
                artist: item.track.artists.map((artist) => artist.name).join(', '),
                cover: item.track.album.images[0]?.url,
                previewUrl: item.track.preview_url
            }));

        if (this.state.playlist.length === 0) {
            this.showToast('No previewable tracks found in this playlist.', true);
            return;
        }

        this.renderPlaylist();
        this.loadTrack(0);
    }

    async spotifyRequest(url) {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.state.token}`
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('spotify_token');
            localStorage.removeItem('spotify_token_expiry');
            this.showToast('Session expired. Redirecting to Access Portal.', true);
            setTimeout(() => window.location.href = this.paths.auth, 1500);
            throw new Error('Token expired');
        }

        if (!response.ok) {
            throw new Error(`Spotify API error: ${response.statusText}`);
        }

        return response.json();
    }

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
            this.state.audio.play().catch((error) => console.error('Playback failed', error));
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
        this.elements.playBtn.addEventListener('click', () => this.togglePlay());

        this.elements.prevBtn.addEventListener('click', () => {
            let newIndex = this.state.currentIndex - 1;
            if (newIndex < 0) newIndex = this.state.playlist.length - 1;
            this.playTrack(newIndex);
        });

        this.elements.nextBtn.addEventListener('click', () => {
            let newIndex = this.state.currentIndex + 1;
            if (newIndex >= this.state.playlist.length) newIndex = 0;
            this.playTrack(newIndex);
        });

        this.state.audio.ontimeupdate = () => {
            if (!this.state.audio.duration) return;
            const progress = (this.state.audio.currentTime / this.state.audio.duration) * 100;
            this.elements.progressFill.style.width = `${progress}%`;
        };

        this.state.audio.onended = () => this.elements.nextBtn.click();

        this.elements.progressBar.addEventListener('click', (event) => {
            const rect = this.elements.progressBar.getBoundingClientRect();
            const percent = (event.clientX - rect.left) / rect.width;
            this.state.audio.currentTime = percent * this.state.audio.duration;
        });

        this.elements.progressBar.addEventListener('mousemove', (event) => {
            const rect = this.elements.progressBar.getBoundingClientRect();
            const percent = (event.clientX - rect.left) / rect.width;
            const time = percent * 30;
            this.elements.timeTooltip.textContent = `0:${Math.floor(time).toString().padStart(2, '0')}`;
            this.elements.timeTooltip.style.left = `${percent * 100}%`;
        });

        this.elements.volumeSlider.addEventListener('click', (event) => {
            const rect = this.elements.volumeSlider.getBoundingClientRect();
            const percent = 1 - (event.clientY - rect.top) / rect.height;
            this.state.volume = Math.max(0, Math.min(1, percent));
            this.state.audio.volume = this.state.volume;
            this.elements.volumeLevel.style.height = `${this.state.volume * 100}%`;
        });

        this.elements.playlistTrigger.addEventListener('click', () => {
            this.elements.playlistDrawer.classList.add('open');
        });

        this.elements.closeDrawer.addEventListener('click', () => {
            this.elements.playlistDrawer.classList.remove('open');
        });
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
    window.app = new SonicFlow();
});
