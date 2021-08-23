'use strict';

class Message {
    command;
    data;

    constructor(command, data) {
        this.command = command;
        this.data = data;
    }
}

module.exports.Message = Message;