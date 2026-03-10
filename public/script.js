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

const socket = io();
let currentScore = 0;

function join() {
    const name = document.getElementById('playerName').value;
    const code = document.getElementById('ticketCode').value;
    if(name && code) {
        socket.emit('joinGame', { name: name, code: code });
    } else {
        alert("Name und Code fehlen!");
    }
}

socket.on('playerAccepted', () => {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('battle-arena').classList.remove('hidden');
});

document.getElementById('click-button').addEventListener('click', () => {
    currentScore += 10;
    socket.emit('playerClick', { score: currentScore });
    const btn = document.getElementById('click-button');
    btn.style.transform = "scale(0.95)";
    setTimeout(() => btn.style.transform = "scale(1)", 50);
});

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

socket.on('timerUpdate', (time) => {
    const timerDiv = document.getElementById('timer');
    timerDiv.innerText = `00:${time < 10 ? '0' + time : time}`;
    if(time <= 10) timerDiv.style.color = "#ff00ff";
});

socket.on('gameStarted', () => {
    currentScore = 0;
    document.getElementById('timer').style.color = "#00d4ff";
});

socket.on('gameFinished', (winner) => {
    if (winner) alert(`🏆 SIEGER: ${winner.name} mit ${winner.score} Punkten!`);
});

socket.on('gameReset', () => location.reload());

function spawnBonusLogo() {
    const logo = document.createElement('img');
    logo.src = 'image/logo.jpeg'; 
    logo.className = 'bonus-logo';
    
    // Styling direkt im JS für maximale Kontrolle
    logo.style.position = 'fixed'; 
    logo.style.zIndex = '9999';
    
    // Größe anpassen - 'contain' sorgt dafür, dass nichts verzerrt
    logo.style.width = '90px';
    logo.style.height = '90px';
    logo.style.objectFit = 'contain'; 
    
    // Design-Finish
    logo.style.backgroundColor = 'rgba(0, 0, 0, 0.4)'; // Leichter dunkler Hintergrund
    logo.style.borderRadius = '50%'; // Macht den Hintergrund rund
    logo.style.padding = '5px'; // Abstand zum Rand
    logo.style.border = '2px solid var(--neon-blue)';
    logo.style.boxShadow = '0 0 20px var(--neon-blue)';
    logo.style.cursor = 'pointer';

    // Zufällige Position
    const x = Math.random() * (window.innerWidth - 120);
    const y = Math.random() * (window.innerHeight - 120);
    
    logo.style.left = x + 'px';
    logo.style.top = y + 'px';
    
    logo.onclick = () => {
        currentScore += 100;
        socket.emit('playerClick', { score: currentScore });
        logo.remove();
    };
    
    document.body.appendChild(logo);
    
    // Verschwindet nach 2 Sekunden
    setTimeout(() => { if(logo.parentNode) logo.remove(); }, 2000);
}



socket.on('spawnBoost', () => spawnBonusLogo());
socket.on('error', (msg) => alert(msg));