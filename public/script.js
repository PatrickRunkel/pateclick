const socket = io();
let currentScore = 0;
let gameActive = false; 
const clickBtn = document.getElementById('click-button');

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
    if(clickBtn) clickBtn.style.opacity = "0.3";
});

socket.on('gameStarted', () => { 
    currentScore = 0; 
    gameActive = true; 
    if(clickBtn) {
        clickBtn.style.opacity = "1";
        clickBtn.style.boxShadow = "0 0 30px #ff00ff";
    }
});

function handleTap(e) {
    if (e) e.preventDefault();
    if (!gameActive) return;

    currentScore += 10;
    socket.emit('playerClick', { score: currentScore }); 
    
    if(clickBtn) {
        clickBtn.style.transform = "scale(0.92)";
        setTimeout(() => clickBtn.style.transform = "scale(1)", 40);
    }
}

if (clickBtn) {
    clickBtn.addEventListener('touchstart', handleTap, { passive: false });
    clickBtn.addEventListener('mousedown', (e) => {
        if (!('ontouchstart' in window)) handleTap(e);
    });
}

socket.on('updateScoreboard', (players) => {
    const board = document.getElementById('scoreboard');
    if (!board) return;
    board.innerHTML = '';
    
    players.sort((a, b) => b.score - a.score).forEach(player => {
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

socket.on('gameFinished', (w) => { 
    gameActive = false; 
    if(clickBtn) {
        clickBtn.style.opacity = "0.3";
        clickBtn.style.boxShadow = "none";
    }
    if (w) alert(`🏆 SIEGER: ${w.name}`); 
});

socket.on('gameReset', () => location.reload());

// VERBESSERTE BONUS FUNKTION
function spawnBonusLogo() {
    if (!gameActive) return; 
    
    const img = document.createElement('img');
    img.src = 'image/logo.jpeg'; 
    
    // Styling direkt im JS für garantierte Sichtbarkeit
    img.style.position = 'fixed';
    img.style.zIndex = '10000'; // Höher als alles andere
    img.style.width = '80px';
    img.style.height = '80px';
    img.style.borderRadius = '50%';
    img.style.border = '3px solid #00d4ff';
    img.style.boxShadow = '0 0 20px #00d4ff';
    img.style.cursor = 'pointer';
    
    // Zufällige Position
    const x = Math.random() * (window.innerWidth - 100);
    const y = Math.random() * (window.innerHeight - 150); // Etwas Platz nach unten lassen
    img.style.left = x + 'px';
    img.style.top = y + 'px';
    
    // Klick-Event
    img.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        currentScore += 100;
        socket.emit('playerClick', { score: currentScore });
        img.remove();
    });
    
    document.body.appendChild(img);
    
    // Automatisches Entfernen nach 2 Sekunden
    setTimeout(() => {
        if (img.parentElement) img.remove();
    }, 850);
}

socket.on('spawnBoost', () => {
    console.log("Boost-Signal empfangen!"); // Zum Testen in der Konsole
    spawnBonusLogo();
});

socket.on('error', (msg) => alert(msg));