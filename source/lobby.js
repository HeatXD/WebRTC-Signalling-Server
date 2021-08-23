"use strict";

const { v4: uuidv4 } = require('uuid');
const { Message } = require('./message.js');

class Room {
    uuid;
    host;
    sealed;
    lastActivity;
    connectedPlayers;

    constructor() {
        this.uuid = uuidv4();
        this.host = null;
        this.sealed = false;
        this.lastActivity = Date.now();
        this.connectedPlayers = [];
    }
    getPlayerId(player) {
        if (this.host.id === player.id) return 1;
        return player.id;
    }
    addPlayer(player) {
        this.lastActivity = Date.now();
        const assigned = this.getPlayerId(player);
        const notif = new Message("###!CTR", assigned);
        player.endpoint.send(JSON.stringify(notif));
        this.connectedPlayers.forEach(p => {
            const answers = [new Message("###!RPC", assigned), new Message("###!RPC", this.getPlayerId(p))];
            p.endpoint.send(JSON.stringify(answers[0]));
            player.endpoint.send(JSON.stringify(answers[1]));
        });
        this.connectedPlayers.push(player);
    }
    removePlayer(player) {
        this.lastActivity = Date.now();
        const idx = this.connectedPlayers.findIndex((p) => player === p);
        if (idx === -1) return false;
        const assigned = this.getPlayerId(player);
        const close = assigned === 1;
        this.connectedPlayers.forEach(p => {
            if (close) {
                p.endpoint.close(4000, "Host Disconnected")
            } else {
                const answer = new Message("###!RPD", assigned)
                p.endpoint.send(JSON.stringify(answer));
            }
        });
        this.connectedPlayers.splice(idx, 1);
    }
    getPlayerNames() {
        let arr = [];
        this.connectedPlayers.forEach(p => arr.push(p.nickname));
        return arr;
    }
    findPlayer(id) {
        let ret;
        for (let i = 0; i < this.connectedPlayers.length; i++) {
            const element = this.connectedPlayers[i];
            if (element.id == id) {
                console.log("Found Player!");
                ret = element;
                break;
            }
        }
        return ret;
    }
}

class Lobby {
    currentRooms;
    connectedPlayers;

    constructor() {
        this.currentRooms = [];
        this.connectedPlayers = [];
    }
    addPlayer(player) {
        this.connectedPlayers.push(player);
    }
    removePlayer(id) {
        for (let i = 0; i < this.connectedPlayers.length; i++) {
            const element = this.connectedPlayers[i];
            if (element.id == id) {
                this.connectedPlayers.splice(i, 1);
                break;
            }
        }
    }
    getPlayer(id) {
        this.connectedPlayers.forEach(player => {
            if (player.id === id) {
                return player;
            }
        });
        return null;
    }
    addRoom(room) {
        this.currentRooms.push(room);
    }
    removeRoom(uuid) {
        for (let i = 0; i < this.currentRooms.length; i++) {
            const element = this.currentRooms[i];
            if (element.uuid == uuid) {
                this.currentRooms.splice(i, 1);
                break;
            }
        }
    }
    findRoom(uuid) {
        for (let i = 0; i < this.currentRooms.length; i++) {
            const element = this.currentRooms[i];
            if (element.uuid == uuid) {
                return element;
            }
        }
        return null;
    }
}

module.exports.Lobby = Lobby;
module.exports.Room = Room;