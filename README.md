# WebRTC-Signalling-Server
WebRTC-Signalling-Server originally built for a godot gamejam. might be rough around the edges.

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
