const socket = io();
let currentScore = 0;
let gameActive = false; // Spiel ist standardmäßig gesperrt
const clickBtn = document.getElementById('click-button');

// Verhindert Zoom bei schnellem Tippen auf Mobilgeräten
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

function join() {
    const name = document.getElementById('playerName').value;
    const code = document.getElementById('ticketCode').value;
    if(name && code) socket.emit('joinGame', { name, code });
}

socket.on('playerAccepted', () => {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('battle-arena').classList.remove('hidden');
    // Button beim Beitritt sicherheitshalber auf inaktiv setzen
    if(clickBtn) clickBtn.style.opacity = "0.3";
});

// SIGNAL VOM SERVER: Spiel startet
socket.on('gameStarted', () => { 
    currentScore = 0; 
    gameActive = true; // SPERRE WIRD GELÖST
    if(clickBtn) {
        clickBtn.style.opacity = "1"; // Button wird hell
        clickBtn.style.boxShadow = "0 0 30px #ff00ff"; // Pinker Glow
    }
});

function handleTap(e) {
    if (e) e.preventDefault();
    
    // DIE SPERRE: Nur ausführen, wenn gameActive wahr ist
    if (!gameActive) return;

    currentScore += 10;
    socket.emit('playerClick', { score: currentScore });
    
    if(clickBtn) {
        clickBtn.style.transform = "scale(0.92)";
        setTimeout(() => clickBtn.style.transform = "scale(1)", 40);
    }
}

// Event-Listener für Klicks & Touch
if (clickBtn) {
    clickBtn.addEventListener('touchstart', handleTap, { passive: false });
    clickBtn.addEventListener('mousedown', (e) => {
        if (!('ontouchstart' in window)) handleTap(e);
    });
}

// SCOREBOARD MIT 10.000 PUNKTEN ZIEL
socket.on('updateScoreboard', (players) => {
    const board = document.getElementById('scoreboard');
    if (!board) return;
    board.innerHTML = '';
    
    players.sort((a, b) => b.score - a.score).forEach(player => {
        // HIER: Berechnung auf 10.000 Punkte
        const percent = Math.min((player.score / 10000) * 100, 100); 
        
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `
            <span class="player-name">${player.name}</span>
            <div class="progress-container">
                <div class="progress-bar" style="width:${percent}%"></div>
            </div>
            <span class="score-val">${player.score}</span>
        `;
        board.appendChild(row);
    });
});

socket.on('timerUpdate', (time) => {
    const t = document.getElementById('timer');
    if(t) t.innerText = `00:${time < 10 ? '0' + time : time}`;
});

// SIGNAL VOM SERVER: Spiel beendet
socket.on('gameFinished', (w) => { 
    gameActive = false; // SPERRE WIEDER AKTIV
    if(clickBtn) {
        clickBtn.style.opacity = "0.3"; // Button wieder grau
        clickBtn.style.boxShadow = "none";
    }
    if (w) alert(`🏆 SIEGER: ${w.name}`); 
});

socket.on('gameReset', () => location.reload());

function spawnBonusLogo() {
    if (!gameActive) return; // Bonus nur während des Spiels
    const img = document.createElement('img');
    img.src = 'image/logo.jpeg';
    img.style.cssText = `
        position:fixed; 
        z-index:9999; 
        width:80px; 
        height:80px; 
        border-radius:50%; 
        border:2px solid #00d4ff; 
        left:${Math.random()*(window.innerWidth-100)}px; 
        top:${Math.random()*(window.innerHeight-100)}px;
        cursor: pointer;
    `;
    
    img.onclick = () => { 
        currentScore += 100; 
        socket.emit('playerClick', { score: currentScore }); 
        img.remove(); 
    };
    
    document.body.appendChild(img);
    setTimeout(() => { if(img.parentNode) img.remove(); }, 2000);
}

socket.on('spawnBoost', spawnBonusLogo);
socket.on('error', (msg) => alert(msg));