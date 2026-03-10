const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = [];
let gameTimer = null;
let timeLeft = 60;

io.on('connection', (socket) => {
    console.log('User verbunden:', socket.id);

    socket.on('joinGame', (data) => {
        if (players.length < 10) {
            const newPlayer = { id: socket.id, name: data.name || "Gast", score: 0 };
            players.push(newPlayer);
            socket.emit('playerAccepted'); 
            io.emit('updateScoreboard', players);
        } else {
            socket.emit('error', 'Runde ist voll!');
        }
    });

    socket.on('playerClick', (data) => {
        const player = players.find(p => p.id === socket.id);
        if (player) {
            player.score = data.score;
            io.emit('updateScoreboard', players);
        }
    });

    socket.on('adminStartGame', () => {
        if (gameTimer) clearInterval(gameTimer);
        timeLeft = 60;
        players.forEach(p => p.score = 0);
        io.emit('updateScoreboard', players);
        io.emit('gameStarted', timeLeft);

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
        timeLeft = 60;
        players = [];
        io.emit('updateScoreboard', players);
        io.emit('timerUpdate', timeLeft);
        io.emit('gameReset');
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('updateScoreboard', players);
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`PateGames läuft auf Port ${PORT}`));