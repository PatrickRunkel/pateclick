const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/legal', (req, res) => res.sendFile(path.join(__dirname, 'public', 'legal.html')));

let validTickets = [];
let players = [];
let gameTimer = null;
let registrationOpen = true;
let gameActive = false;

function generateTickets() {
    validTickets = [];
    const buchstaben = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    while (validTickets.length < 20) {
        let code = "";
        for (let i = 0; i < 5; i++) code += buchstaben.charAt(Math.floor(Math.random() * buchstaben.length));
        if (!validTickets.includes(code)) validTickets.push(code);
    }
}
generateTickets();

io.on('connection', (socket) => {
    socket.emit('updateTicketList', validTickets);
    socket.emit('ticketStatusChanged', registrationOpen);
    socket.emit('updateScoreboard', players);

    socket.on('addSingleTicket', (code) => {
        if(!validTickets.includes(code)) {
            validTickets.push(code);
            io.emit('updateTicketList', validTickets);
        }
    });

    socket.on('joinGame', (data) => {
        if (!registrationOpen) return socket.emit('error', 'Anmeldung geschlossen!');
        const ticketIndex = validTickets.indexOf(data.code);
        
        if (ticketIndex !== -1 || data.code === "ADMIN") {
            if (players.length < 10) {
                // Falls Spieler mit gleicher ID existiert, erst löschen (Reconnect-Fix)
                players = players.filter(p => p.id !== socket.id);
                players.push({ id: socket.id, name: data.name.substring(0,12) || "Gast", score: 0 });
                if (data.code !== "ADMIN") validTickets.splice(ticketIndex, 1); 
                
                socket.emit('playerAccepted'); 
                io.emit('updateScoreboard', players);
                io.emit('updateTicketList', validTickets);
            } else { socket.emit('error', 'Arena voll!'); }
        } else { socket.emit('error', 'Code ungültig!'); }
    });

    socket.on('playerClick', (data) => {
        const player = players.find(p => p.id === socket.id);
        if (player && gameActive) { 
            player.score = data.score; 
            // Schnelles Update an alle
            io.emit('updateScoreboard', players); 
        }
    });

    socket.on('adminStartGame', () => {
        if(players.length === 0) return;
        registrationOpen = false;
        gameActive = true;
        io.emit('ticketStatusChanged', false); 
        players.forEach(p => p.score = 0);
        io.emit('updateScoreboard', players);
        io.emit('gameStart');

        setTimeout(() => {
            let timeLeft = 60;
            if (gameTimer) clearInterval(gameTimer);
            gameTimer = setInterval(() => {
                timeLeft--;
                io.emit('timerUpdate', timeLeft);
                if (Math.random() < 0.40) io.emit('spawnBoost', { type: Math.random() > 0.5 ? 'diamond' : 'gold' });
                
                if (timeLeft <= 0) {
                    clearInterval(gameTimer);
                    gameTimer = null;
                    gameActive = false;
                    const winner = [...players].sort((a, b) => b.score - a.score)[0];
                    io.emit('gameFinished', winner);
                }
            }, 1000);
        }, 5000);
    });

    socket.on('adminResetGame', () => {
        if (gameTimer) clearInterval(gameTimer);
        gameTimer = null;
        gameActive = false;
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
        // 5 Sekunden warten vor dem Löschen (hilft bei kurzen Netzschwankungen)
        const discoId = socket.id;
        setTimeout(() => {
            const stillConnected = io.sockets.sockets.get(discoId);
            if (!stillConnected) {
                players = players.filter(p => p.id !== discoId);
                io.emit('updateScoreboard', players);
            }
        }, 5000);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft`));