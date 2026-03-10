// --- ANTI-ZOOM & MULTI-TOUCH FIX (iOS) ---
document.addEventListener('touchstart', function (event) {
    if (event.touches.length > 1) {
        event.preventDefault(); // Verhindert Multi-Touch Zoom
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    let now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault(); // Verhindert Doppelklick-Zoom
    }
    lastTouchEnd = now;
}, false);

// --- HAUPT-LOGIK ---
const socket = io();
let currentScore = 0;
const clickBtn = document.getElementById('click-button');

function join() {
    const name = document.getElementById('playerName').value;
    const code = document.getElementById('ticketCode').value;
    if(name && code) {
        socket.emit('joinGame', { name: name, code: code });
    } else {
        alert("Name und Code fehlen!");
    }
}

// --- SPIELER BEITRITT ---
socket.on('playerAccepted', () => {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('battle-arena').classList.remove('hidden');
});

// --- OPTIMIERTE KLICK-FUNKTION (Touch & Mouse) ---
function handleTap(e) {
    if (e) e.preventDefault(); // Stoppt Browser-Interaktion (Zoom/Scroll)
    
    currentScore += 10;
    socket.emit('playerClick', { score: currentScore });
    
    // Visuelles Feedback
    clickBtn.style.transform = "scale(0.92)";
    setTimeout(() => {
        clickBtn.style.transform = "scale(1)";
    }, 40);
}

// Event-Listener für sofortige Reaktion auf dem iPhone
if (clickBtn) {
    clickBtn.addEventListener('touchstart', handleTap, { passive: false });
    clickBtn.addEventListener('mousedown', (e) => {
        // Verhindert Doppel-Zählung: Wenn Touch verfügbar ist, ignoriere Mouse-Events
        if (!('ontouchstart' in window)) {
            handleTap(e);
        }
    });
}

// --- SCOREBOARD UPDATES ---
socket.on('updateScoreboard', (players) => {
    const board = document.getElementById('scoreboard');
    board.innerHTML = '';
    players.sort((a, b) => b.score - a.score);

    players.forEach(player => {
        // Berechnung für 10.000 Punkte Limit
        const progressPercent = Math.min((player.score / 10000) * 100, 100);
        
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `
            <span class="player-name">${player.name}</span>
            <div class="progress-container">
                <div class="progress-bar" style="width: ${progressPercent}%"></div>
            </div>
            <span class="score-val">${player.score}</span>
        `;
        board.appendChild(row);
    });
});

// --- TIMER & GAME EVENTS ---
socket.on('timerUpdate', (time) => {
    const timerDiv = document.getElementById('timer');
    if (timerDiv) {
        timerDiv.innerText = `00:${time < 10 ? '0' + time : time}`;
        if(time <= 10) timerDiv.style.color = "#ff00ff";
    }
});

socket.on('gameStarted', () => {
    currentScore = 0;
    const timerDiv = document.getElementById('timer');
    if (timerDiv) timerDiv.style.color = "#00d4ff";
});

socket.on('gameFinished', (winner) => {
    if (winner) alert(`🏆 SIEGER: ${winner.name} mit ${winner.score} Punkten!`);
});

socket.on('gameReset', () => location.reload());

// --- BONUS LOGO (BOOST) ---
function spawnBonusLogo() {
    const logo = document.createElement('img');
    logo.src = 'image/logo.jpeg'; 
    logo.className = 'bonus-logo';
    
    // Styling für iPhone & Desktop Performance
    logo.style.position = 'fixed'; 
    logo.style.zIndex = '9999';
    logo.style.width = '90px';
    logo.style.height = '90px';
    logo.style.objectFit = 'contain'; 
    logo.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    logo.style.borderRadius = '50%';
    logo.style.padding = '5px';
    logo.style.border = '2px solid var(--neon-blue)';
    logo.style.boxShadow = '0 0 20px var(--neon-blue)';
    logo.style.cursor = 'pointer';
    logo.style.touchAction = 'none'; // Ganz wichtig für iPhone

    const x = Math.random() * (window.innerWidth - 120);
    const y = Math.random() * (window.innerHeight - 120);
    
    logo.style.left = x + 'px';
    logo.style.top = y + 'px';
    
    // Touch-Reaktion für Boost-Logo
    const handleBoostTap = (e) => {
        if (e) e.preventDefault();
        currentScore += 100;
        socket.emit('playerClick', { score: currentScore });
        logo.remove();
    };

    logo.addEventListener('touchstart', handleBoostTap, { passive: false });
    logo.onclick = handleBoostTap; // Fallback für Desktop
    
    document.body.appendChild(logo);
    
    setTimeout(() => { if(logo.parentNode) logo.remove(); }, 2000);
}

socket.on('spawnBoost', () => spawnBonusLogo());
socket.on('error', (msg) => alert(msg));