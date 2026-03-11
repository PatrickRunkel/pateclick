const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let validTickets = [];
function generateTickets() {
    validTickets = [];
    for (let i = 1; i <= 50; i++) {
        validTickets.push("PATE" + i.toString().padStart(2, '0'));
    }
}
generateTickets();

let players = [];
let gameTimer = null;
let timeLeft = 60;
let registrationOpen = true;

io.on('connection', (socket) => {
    socket.emit('updateTicketList', validTickets);
    socket.emit('ticketStatusChanged', registrationOpen);
    socket.emit('updateScoreboard', players);

    socket.on('joinGame', (data) => {
        if (!registrationOpen) return socket.emit('error', 'Anmeldung geschlossen!');
        const ticketIndex = validTickets.indexOf(data.code);
        if (ticketIndex !== -1) {
            if (players.length < 10) {
                players.push({ id: socket.id, name: data.name || "Gast", score: 0 });
                validTickets.splice(ticketIndex, 1); 
                socket.emit('playerAccepted'); 
                io.emit('updateScoreboard', players);
                io.emit('updateTicketList', validTickets);
            } else { socket.emit('error', 'Arena voll!'); }
        } else { socket.emit('error', 'Code ungültig!'); }
    });

    socket.on('playerClick', (data) => {
        const player = players.find(p => p.id === socket.id);
        if (player) { player.score = data.score; io.emit('updateScoreboard', players); }
    });

    socket.on('adminStartGame', () => {
        registrationOpen = false;
        io.emit('ticketStatusChanged', false);
        if (gameTimer) clearInterval(gameTimer);
        timeLeft = 60;
        players.forEach(p => p.score = 0);
        io.emit('updateScoreboard', players);
        io.emit('gameStarted');
        gameTimer = setInterval(() => {
            timeLeft--;
            io.emit('timerUpdate', timeLeft);
            if (Math.random() < 0.15) io.emit('spawnBoost');
            if (timeLeft <= 0) {
                clearInterval(gameTimer);
                gameTimer = null;
                const winner = [...players].sort((a, b) => b.score - a.score)[0];
                io.emit('gameFinished', winner);
            }
        }, 1000);
    });

    socket.on('adminResetGame', () => {
        if (gameTimer) clearInterval(gameTimer);
        gameTimer = null;
        players = [];
        registrationOpen = true;
        generateTickets();
        io.emit('updateScoreboard', players);
        io.emit('updateTicketList', validTickets);
        io.emit('timerUpdate', 60);
        io.emit('gameReset');
        io.emit('ticketStatusChanged', true);
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('updateScoreboard', players);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));