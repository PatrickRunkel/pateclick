const socket = io();
let currentScore = 0;
let gameActive = false; 
const clickBtn = document.getElementById('click-button');

// Verhindert Zooming auf mobilen Geräten
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Login Funktion
function join() {
    const nameInput = document.getElementById('playerName');
    const codeInput = document.getElementById('ticketCode');
    
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    
    if(name && code) {
        socket.emit('joinGame', { name, code });
    } else {
        alert("Bitte Name und Code eingeben!");
    }
}

// Wenn der Server den Spieler akzeptiert
socket.on('playerAccepted', () => {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('battle-arena').classList.remove('hidden');
    if(clickBtn) clickBtn.style.opacity = "0.3";
});

// --- DER ROTE 5-SEKUNDEN COUNTDOWN ---
socket.on('gameStart', () => {
    const overlay = document.getElementById('start-countdown-overlay');
    const numberDisplay = document.getElementById('countdown-number');
    
    let count = 5;
    numberDisplay.innerText = count;
    overlay.classList.remove('hidden'); 
    gameActive = false; // Klicks noch gesperrt
    
    if(clickBtn) {
        clickBtn.disabled = true;
        clickBtn.style.opacity = "0.2";
    }

    const interval = setInterval(() => {
        count--;
        
        // Kurze Vibration bei jedem Tick
        if ("vibrate" in navigator) navigator.vibrate(50);
        
        if (count > 0) {
            numberDisplay.innerText = count;
        } else {
            clearInterval(interval);
            numberDisplay.innerText = "GO!";
            
            // Kräftige Vibration zum Startschuss
            if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);

            setTimeout(() => {
                overlay.classList.add('hidden'); 
                gameActive = true; // JETZT darf geklickt werden
                if(clickBtn) {
                    clickBtn.disabled = false;
                    clickBtn.style.opacity = "1";
                    clickBtn.style.boxShadow = "0 0 30px #ff00ff";
                }
            }, 600);
        }
    }, 1000);
});

// Klick-Verarbeitung
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

// Event Listener für den Button
if (clickBtn) {
    clickBtn.addEventListener('touchstart', handleTap, { passive: false });
    clickBtn.addEventListener('mousedown', (e) => {
        if (!('ontouchstart' in window)) handleTap(e);
    });
}

// Scoreboard Update
socket.on('updateScoreboard', (players) => {
    const board = document.getElementById('scoreboard');
    if (!board) return;
    board.innerHTML = '';
    
    players.sort((a, b) => b.score - a.score).forEach(player => {
        const percent = Math.min((player.score / 1000) * 100, 100); 
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

// Timer Update (kommt vom Server)
socket.on('timerUpdate', (time) => {
    const t = document.getElementById('timer');
    if(t) t.innerText = `00:${time < 10 ? '0' + time : time}`;
});

// Spiel beendet
socket.on('gameFinished', (w) => { 
    gameActive = false; 
    if(clickBtn) {
        clickBtn.style.opacity = "0.3";
        clickBtn.style.boxShadow = "none";
    }
    if (w) alert(`🏆 SIEGER: ${w.name}`); 
});

socket.on('gameReset', () => location.reload());

// Bonus Logik
function spawnBonusLogo() {
    if (!gameActive) return; 
    const img = document.createElement('img');
    img.src = 'image/logo.jpeg'; 
    img.style.position = 'fixed';
    img.style.zIndex = '10000';
    img.style.width = '80px';
    img.style.height = '80px';
    img.style.borderRadius = '50%';
    img.style.border = '3px solid #ffd700';
    img.style.boxShadow = '0 0 20px #ffd700';
    img.style.cursor = 'pointer';
    
    const x = Math.random() * (window.innerWidth - 100);
    const y = Math.random() * (window.innerHeight - 150);
    img.style.left = x + 'px';
    img.style.top = y + 'px';
    
    img.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        currentScore += 100;
        socket.emit('playerClick', { score: currentScore });
        img.remove();
    });
    document.body.appendChild(img);
    setTimeout(() => { if (img.parentElement) img.remove(); }, 400);
}

socket.on('spawnBoost', () => spawnBonusLogo());
socket.on('error', (msg) => alert(msg));