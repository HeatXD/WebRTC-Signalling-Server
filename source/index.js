'use strict';
/*
    PLAYER COMMANDS                                   MESSAGE DATA
    ----------------------------------------------------------------------------
    Register Player     \  ###!RP   \                 <PlayerName>
    Create Room         \  ###!CR   \                    'null'
    Join Room           \  ###!JR   \                  <RoomUUID>
    Seal Room           \  ###!SR   \                    'null'
    Send Message        \  ###!SM   \                  <Message>
    Send Offer          \  ###!OO   \      {id:<RecipientID>,rtc:<WebRTCData>}
    Send Answer         \  ###!AA   \      {id:<RecipientID>,rtc:<WebRTCData>}
    Send Candidate      \  ###!CC   \      {id:<RecipientID>,rtc:<WebRTCData>}
    ----------------------------------------------------------------------------
    SERVER RESPONSES
    ----------------------------------------------------------------------------
    Register Player OK      \ ###!RPK   \             <PlayerID>
    Register Player BAD     \ ###!RPB   \              <Reason>
    Create Room  OK         \ ###!CRK   \             <RoomUUID>
    Create Room  BAD        \ ###!CRB   \              <Reason>
    Join Room  OK           \ ###!JRK   \           <[PlayerNames]>   
    Join Room  BAD          \ ###!JRB   \              <Reason> 
    Connected To Room       \ ###!CTR   \             <PlayerID>
    Room Peer Connected     \ ###!RPC   \             <PlayerID>
    Room Peer Disconnected  \ ###!RPD   \             <PlayerID>
    Seal Room OK            \ ###!SRK   \               'null'
    Seal Room BAD           \ ###!SRB   \              <Reason>
    Room Message OK         \ ###!RMK   \              <Message>
    Room Message BAD        \ ###!RMB   \              <Reason>
    Issued Command BAD      \ ###!ICB   \              <Reason>
    Player Timed Out        \ ###!PTO   \              <Reason>
    Recieve Offer           \ ###!OOO   \   {id:<SenderID>,rtc:<WebRTCData>}
    Recieve Answer          \ ###!AAA   \   {id:<SenderID,rtc:<WebRTCData>}
    Recieve Candidate       \ ###!CCC   \   {id:<SenderID>,rtc:<WebRTCData>}
    ------------------------------------------------------------------------------
    With All The WebRTC related commands, I dont disclose which data should be sent
    since this signaling server doesn't care about the data of the message. It only
    needs to relay the message to the designated client. thats why i just show it as
    rtc.

    Whenever the needed message data is 'null' means that no meaningful data is needed
    for the command. for example the client should just send a json message with 
    command:"##!CR" and data:"null". the server can also send a null response but 
    only for the command Seal Room Ok.
*/

const WebSocket = require('ws');

const { Player } = require('./player.js');
const { Lobby, Room } = require('./lobby.js');
const { Message } = require('./message.js');

const PORT = process.env.PORT || 6755
const MAX_PEERS = 512;
const MAX_ROOMS = 256;

const wss = new WebSocket.Server({ port: PORT });
const gameLobby = new Lobby();

let roomCleaner = null;
let peerCount = 0;

wss.on('connection', (ws) => {
    if (peerCount >= MAX_PEERS) {
        ws.close(4000, "Too Many Peers");
    }
    peerCount++;
    let client = {};
    //console.log("New Client Connected!");
    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        // console.log(data);
        if (data['command']) {
            const newMsg = new Message(data.command, data.data);
            handleCommands(newMsg, client, ws);
            // console.log(data);
        }
    });
    ws.on('close', () => {
        peerCount--;
        if (!ObjectIsEmpty(client)) {
            //console.log('A');
            if (client.player.currentRoom != null) {
                //console.log('B');
                let room = gameLobby.findRoom(client.player.currentRoom);
                room.removePlayer(client.player);
                if (room.connectedPlayers.length == 0) {
                    //console.log('C');
                    gameLobby.removeRoom(client.player.currentRoom);
                }
            }
            //console.log('D');
            gameLobby.removePlayer(client.player.id);
            client = {};
        }
        console.log(gameLobby);
        //console.log("Client disconnected! with code: " + code + ", reason: " + reason);
    });
    // check after 2 seconds if player still didnt register. if they didnt disconnect them.
    handleUnregisteredPlayers(client, ws);
    // check after 20 seconds if player is not in a room. disconnect them.
    handleAFKPlayers(client, ws);
    // init the room cleaner. 
    // when active checks every 10 seconds if the room has been inactive for 30 Seconds
    if (roomCleaner == null) {
        handleAFKRooms();
    }
});

function handleUnregisteredPlayers(client, ws) {
    setTimeout(() => {
        if (client.player == null) {
            const answer = new Message("###!PTO", "Player Didn't Register In Time");
            ws.send(JSON.stringify(answer));
            ws.close(4000, "Player Not Registered");
        }
        // console.log(gameLobby);
    }, 2000);
}

function handleAFKPlayers(client, ws) {
    setTimeout(() => {
        //console.log(client);
        if (!ObjectIsEmpty(client)) {
            if (client.player.currentRoom == null) {
                const answer = new Message("###!PTO", 'Player Took Too Long To Enter A Room');
                ws.send(JSON.stringify(answer));
                ws.close(4000, "Player AFK In Lobby");
            }
        }
    }, 20000);
}

function handleAFKRooms() {
    roomCleaner = setInterval(() => {
        if (gameLobby.currentRooms.length > 0) {
            gameLobby.currentRooms.forEach(r => {
                const diff = Math.floor((Date.now() - r.lastActivity) / 1000);
                //clean the room if it is inactive for more than 30 seconds
                if (diff > 30) {
                    r.connectedPlayers.forEach(p => {
                        p.endpoint.close(4000, "Room Is Inactive");
                    });
                }
            });
        } else {
            clearInterval(roomCleaner);
        }
    }, 10000);
}

function cleanupSealedRoom(room) {
    // after 10 seconds cleanup the room 
    setTimeout(() => {
        room.connectedPlayers.forEach(p => p.endpoint.close(4000, "Room Cleaned Up"));
    }, 10000);
}

function ObjectIsEmpty(obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return JSON.stringify(obj) === JSON.stringify({});
}

function handleCommands(msg, client, ws) {
    const CMD = msg.command.substring(4, 6);
    //console.log(CMD);
    if (CMD == "RP") {
        //console.log("Register Player");
        if (ObjectIsEmpty(client) && !!msg.data) {
            client.player = new Player(ws, msg.data);
            gameLobby.addPlayer(client.player);
            const answer = new Message("###!RPK", client.player.id);
            ws.send(JSON.stringify(answer));
            return;
        }
        const answer = new Message("###!RPB", "Invalid Player Data Error");
        ws.send(JSON.stringify(answer));
        return;
    }
    switch (CMD) {
        case "CR":
            //console.log("Create Room");
            if (client.player.currentRoom == null && gameLobby.currentRooms.length < MAX_ROOMS) {
                let room = new Room();
                client.player.currentRoom = room.uuid;
                room.host = client.player;
                room.addPlayer(client.player);
                gameLobby.addRoom(room);
                const answer = new Message("###!CRK", room.uuid);
                ws.send(JSON.stringify(answer));
            } else {
                const answer = new Message("###!CRB", "Couldn't Create Room");
                ws.send(JSON.stringify(answer));
            }
            break;
        case "JR":
            if (client.player.currentRoom == null && !!msg.data) {
                const room = gameLobby.findRoom(msg.data);
                if (room != null && room.sealed == false) {
                    client.player.currentRoom = room.uuid;
                    room.addPlayer(client.player);
                    const answer = new Message("###!JRK", room.getPlayerNames());
                    client.player.endpoint.send(JSON.stringify(answer));
                    return;
                }
            }
            const answer = new Message("###!JRB", "Couldn't Find / Join The Room");
            ws.send(JSON.stringify(answer));
            break;
        case "SR":
            //console.log("Seal Room");
            const room = gameLobby.findRoom(client.player.currentRoom);
            if (room != null && room.host == client.player) {
                room.sealed = true;
                room.lastActivity = Date.now();
                room.connectedPlayers.forEach(p => {
                    const answer = new Message("###!SRK", 'null');
                    p.endpoint.send(JSON.stringify(answer));
                });
                cleanupSealedRoom(room);
            } else {
                const answer = new Message("###!SRB", "Room Not Found Or Player Isn't Host");
                ws.send(JSON.stringify(answer));
            }
            break;
        case "SM":
            //console.log("Send Message To Players In The Room");
            if (client.player.currentRoom != null && !!msg.data) {
                const room = gameLobby.findRoom(client.player.currentRoom);
                room.connectedPlayers.forEach(p => {
                    const answer = new Message("###!RMK", msg.data);
                    p.endpoint.send(JSON.stringify(answer));
                });
                room.lastActivity = Date.now();
            } else {
                const answer = new Message("###!RMB", "Couldn't Send Message");
                ws.send(JSON.stringify(answer));
            }
            break;
        case "OO":
        case "AA":
        case "CC":
            //console.log(CMD + " Request");
            if (client.player.currentRoom != null) {
                const room = gameLobby.findRoom(client.player.currentRoom);
                //console.log(msg.data.id)
                if (msg.data.id == 1) {
                    msg.data.id = room.host.id;
                }
                const recipient = room.findPlayer(msg.data.id);
                if (recipient != null) {
                    let message = msg.data;
                    message.id = room.getPlayerId(client.player);
                    const msgType = CMD + CMD.charAt(0);
                    //console.log(msgType);
                    const answer = new Message("###!" + msgType, message);
                    recipient.endpoint.send(JSON.stringify(answer));
                }
            }
            break;
        default:
            console.log("Invalid Command By Player: " + client.player.nickname + " CMD: " + CMD);
            const ans = new Message("###!ICB", "Command Not Found");
            ws.send(JSON.stringify(ans));
            break;
    }
}

console.log("Server Running...");