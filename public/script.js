const socket = io();
let currentScore = 0;
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
});

function handleTap(e) {
    if (e) e.preventDefault();
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
        row.innerHTML = `<span class="player-name">${player.name}</span>
            <div class="progress-container"><div class="progress-bar" style="width:${percent}%"></div></div>
            <span class="score-val">${player.score}</span>`;
        board.appendChild(row);
    });
});

socket.on('timerUpdate', (time) => {
    const t = document.getElementById('timer');
    if(t) t.innerText = `00:${time < 10 ? '0' + time : time}`;
});

socket.on('gameStarted', () => { currentScore = 0; });
socket.on('gameFinished', (w) => { if (w) alert(`🏆 SIEGER: ${w.name}`); });
socket.on('gameReset', () => location.reload());

function spawnBonusLogo() {
    const img = document.createElement('img');
    img.src = 'image/logo.jpeg';
    img.style.cssText = `position:fixed; z-index:9999; width:80px; height:80px; border-radius:50%; border:2px solid #00d4ff; left:${Math.random()*(window.innerWidth-100)}px; top:${Math.random()*(window.innerHeight-100)}px;`;
    img.onclick = () => { currentScore += 100; socket.emit('playerClick', { score: currentScore }); img.remove(); };
    document.body.appendChild(img);
    setTimeout(() => { if(img.parentNode) img.remove(); }, 2000);
}
socket.on('spawnBoost', spawnBonusLogo);
socket.on('error', (msg) => alert(msg));