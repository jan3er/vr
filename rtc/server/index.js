const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 9090 });

var ws1 = null;
var ws2 = null;
var queue = [];

console.log("webserver started");

function closeAll(){
    if (ws1 !== null) ws1.close();
    if (ws2 !== null) ws2.close();
    ws1 = null;
    ws2 = null;
    console.log("close everything");
}

wss.on('connection', function connection(ws) {
    if (ws1 === null) {
        console.log("ws1 joined");
        ws1 = ws;
        ws1.on('message', function incoming(data) {
            console.log("ws1:", data);
            if (ws2 === null) {
                queue.push(data);
            } else {
                ws2.send(data);
            }
        });
        ws1.send("go ahead and start a session");
        ws1.on('close', closeAll );
    }
    else if (ws2 === null) {
        console.log("ws2 joined");
        ws2 = ws;
        ws2.send("somebody will offer you a session soon");
        while(queue.length !== 0){
            ws2.send(queue.shift());    
        }

        ws2.on('message', function incoming(data) {
            console.log("ws2:", data);
            ws1.send(data);
        });
        ws2.on('close', closeAll );
    } else {
        console.log("already full!");
        ws.close();
    }   
});



