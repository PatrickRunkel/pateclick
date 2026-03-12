const socket = io();
let currentScore = 0;
let gameActive = false; 
const clickBtn = document.getElementById('click-button');

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
        clickBtn.style.opacity = "0.2";
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
                if(clickBtn) { clickBtn.disabled = false; clickBtn.style.opacity = "1"; }
            }, 600);
        }
    }, 1000);
});

if (clickBtn) {
    clickBtn.addEventListener('pointerdown', (e) => {
        if (!gameActive) return;
        currentScore += 10;
        socket.emit('playerClick', { score: currentScore });
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
            <div class="progress-container"><div class="progress-bar" style="width:${percent}%"></div></div>
            <span class="score-val">${player.score}</span>
        `;
        board.appendChild(row);
    });
});

function createExplosion(x, y, color) {
    const exp = document.createElement('div');
    exp.className = 'hit-explosion';
    exp.style.left = x + 'px'; exp.style.top = y + 'px';
    exp.style.width = '50px'; exp.style.height = '50px';
    exp.style.background = color || '#ffd700';
    document.body.appendChild(exp);
    setTimeout(() => exp.remove(), 500);
}

socket.on('spawnBoost', (data) => {
    if (!gameActive) return;
    const img = document.createElement('img');
    const type = data.type;
    img.src = type === 'diamond' ? 'https://cdn-icons-png.flaticon.com/512/2953/2953423.png' : 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png';
    img.style.cssText = `position:fixed; z-index:10000; width:70px; height:70px; object-fit:contain; cursor:pointer;`;
    
    const x = Math.random() * (window.innerWidth - 80);
    const y = Math.random() * (window.innerHeight - 150);
    img.style.left = x + 'px'; img.style.top = y + 'px';

    img.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        createExplosion(x, y, type === 'diamond' ? '#00d4ff' : '#ffd700');
        currentScore += (type === 'diamond' ? 100 : 50);
        socket.emit('playerClick', { score: currentScore });
        img.remove();
    });

    document.body.appendChild(img);
    setTimeout(() => img.remove(), 300);
});

socket.on('gameFinished', (winner) => {
    gameActive = false;
    if (winner) {
        document.getElementById('final-winner-name').innerText = winner.name;
        document.getElementById('final-winner-score').innerText = winner.score + " PUNKTE";
        document.getElementById('winner-overlay').classList.remove('hidden');
    }
});

socket.on('timerUpdate', (t) => { document.getElementById('timer').innerText = `00:${t < 10 ? '0'+t : t}`; });
socket.on('gameReset', () => location.reload());
socket.on('error', (msg) => alert(msg));