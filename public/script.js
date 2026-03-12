const socket = io();
let currentScore = 0;
let gameActive = false; 
const clickBtn = document.getElementById('click-button');

/* --- IOS & TOUCH OPTIMIERUNG --- */
// Verhindert Double-Tap-Zoom und Multi-Touch Probleme
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
}, false);

function join() {
    const name = document.getElementById('playerName').value.trim();
    const code = document.getElementById('ticketCode').value.trim().toUpperCase();
    if(name && code) socket.emit('joinGame', { name, code });
}

socket.on('playerAccepted', () => {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('battle-arena').classList.remove('hidden');
});

socket.on('gameStart', () => {
    const overlay = document.getElementById('start-countdown-overlay');
    const display = document.getElementById('countdown-number');
    let count = 5;
    display.innerText = count;
    overlay.classList.remove('hidden'); 
    
    if(clickBtn) {
        clickBtn.disabled = true;
        clickBtn.style.opacity = "0.3";
    }

    const interval = setInterval(() => {
        count--;
        if (count > 0) display.innerText = count;
        else {
            clearInterval(interval);
            display.innerText = "GO!";
            setTimeout(() => {
                overlay.classList.add('hidden'); 
                gameActive = true; 
                if(clickBtn) { 
                    clickBtn.disabled = false; 
                    clickBtn.style.opacity = "1"; 
                }
            }, 400);
        }
    }, 1000);
});

// Der Klick-Handler: Nutzt pointerdown für schnellste Reaktion
if (clickBtn) {
    clickBtn.addEventListener('pointerdown', (e) => {
        if (!gameActive) return;
        e.preventDefault(); // WICHTIG: Verhindert Zoom & Ghost-Clicks
        
        currentScore += 10;
        socket.emit('playerClick', { score: currentScore });
        
        // Optisches Feedback
        clickBtn.style.transform = "scale(0.96)";
        setTimeout(() => { clickBtn.style.transform = "scale(1)"; }, 50);
    });
}

socket.on('updateScoreboard', (players) => {
    const board = document.getElementById('scoreboard');
    if (!board) return;
    board.innerHTML = '';
    
    // Sortieren nach Punkten
    players.sort((a, b) => b.score - a.score).forEach(player => {
        const percent = Math.min((player.score / 10000) * 100, 100); 
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `
            <span class="player-name">${player.name}</span>
            <div class="progress-container"><div class="progress-bar" style="width:${percent}%"></div></div>
            <span class="score-val">${player.score}</span>
        `;
        board.appendChild(row);
    });

    const slotsElement = document.getElementById('slots-count');
    if (slotsElement) {
        const slotsLeft = 10 - players.length;
        slotsElement.innerText = slotsLeft > 0 ? slotsLeft : 0;
    }
});

socket.on('spawnBoost', (data) => {
    if (!gameActive) return;
    const img = document.createElement('img');
    const type = data.type;
    img.src = type === 'diamond' ? 'https://cdn-icons-png.flaticon.com/512/2953/2953423.png' : 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png';
    img.style.cssText = `position:fixed; z-index:10000; width:75px; height:75px; cursor:pointer; touch-action:none;`;
    
    const x = Math.random() * (window.innerWidth - 80);
    const y = Math.random() * (window.innerHeight - 150);
    img.style.left = x + 'px'; img.style.top = y + 'px';

    img.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        currentScore += (type === 'diamond' ? 100 : 50);
        socket.emit('playerClick', { score: currentScore });
        img.remove();
    });

    document.body.appendChild(img);
    setTimeout(() => { if(img) img.remove(); }, 1200);
});

socket.on('gameFinished', (winner) => {
    gameActive = false;
    if (winner) {
        document.getElementById('final-winner-name').innerText = winner.name;
        document.getElementById('final-winner-score').innerText = winner.score + " PUNKTE";
        document.getElementById('winner-overlay').classList.remove('hidden');
    }
});

socket.on('timerUpdate', (t) => { 
    const timerEl = document.getElementById('timer');
    if(timerEl) timerEl.innerText = `00:${t < 10 ? '0'+t : t}`; 
});
socket.on('gameReset', () => {
    currentScore = 0;
    gameActive = false;
    location.reload();
});
socket.on('error', (msg) => alert(msg));