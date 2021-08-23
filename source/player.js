"use strict";

const crypto = require("crypto");

function randomId() {
    return Math.abs(new Int32Array(crypto.randomBytes(4).buffer)[0]).toString();
}

class Player {
    id;
    endpoint;
    nickname;
    currentRoom;

    constructor(endpoint, name) {
        this.id = randomId();
        this.endpoint = endpoint;
        this.nickname = name;
        this.currentRoom = null;
    }
}

module.exports.Player = Player;