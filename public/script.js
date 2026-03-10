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
    logo.style.position = 'fixed';
    logo.style.zIndex = '9999';
    logo.style.width = '80px';
    logo.style.height = '80px';
    logo.style.borderRadius = '50%';
    
    const x = Math.random() * (window.innerWidth - 100);
    const y = Math.random() * (window.innerHeight - 100);
    logo.style.left = x + 'px';
    logo.style.top = y + 'px';
    
    logo.onclick = () => {
        currentScore += 100;
        socket.emit('playerClick', { score: currentScore });
        logo.remove();
    };
    document.body.appendChild(logo);
    setTimeout(() => { if(logo.parentNode) logo.remove(); }, 2000);
}

socket.on('spawnBoost', () => spawnBonusLogo());
socket.on('error', (msg) => alert(msg));