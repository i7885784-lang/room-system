
const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3005;
const rooms = {};

function cleanId(value) {
    return String(value || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 32);
}

function send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function broadcast(roomId, data) {
    if (!rooms[roomId]) return;
    rooms[roomId].forEach(user => send(user.ws, data));
}

function users(roomId) {
    return rooms[roomId].map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar
    }));
}

const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = requestUrl.pathname;

    if (pathname === "/" || pathname.startsWith("/room/")) {
        fs.readFile(path.join(__dirname, "index.html"), "utf8", (err, html) => {
            if (err) {
                res.writeHead(500);
                return res.end("index.html missing");
            }
            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8"
            });
            res.end(html);
        });
        return;
    }

    res.writeHead(404);
    res.end("Not found");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
    let roomId = null;
    let user = null;

    ws.on("message", raw => {
        try {
            const data = JSON.parse(raw.toString());

            if (data.type === "join") {
                roomId = cleanId(data.room);
                if (!roomId) return;

                user = {
                    ws,
                    id: Date.now().toString(),
                    name: String(data.name || "Guest").slice(0, 20),
                    avatar: String(data.avatar || "🙂")
                };

                if (!rooms[roomId]) {
                    rooms[roomId] = [];
                }

                rooms[roomId].push(user);

                broadcast(roomId, {
                    type: "users",
                    users: users(roomId)
                });

                broadcast(roomId, {
                    type: "chat",
                    text: user.name + " вошел в комнату"
                });
            }

            if (data.type === "profile" && user) {
                user.name = String(data.name || "Guest").slice(0, 20);
                user.avatar = String(data.avatar || "🙂");

                broadcast(roomId, {
                    type: "users",
                    users: users(roomId)
                });
            }

            if (data.type === "chat" && user && roomId) {
                const text = String(data.text || "").slice(0, 500);
                if (text) {
                    broadcast(roomId, {
                        type: "chat",
                        text: user.name + ": " + text
                    });
                }
            }

        } catch {
            send(ws, {
                type: "error",
                text: "Invalid data"
            });
        }
    });

    ws.on("close", () => {
        if (roomId && user && rooms[roomId]) {
            rooms[roomId] = rooms[roomId].filter(x => x !== user);

            broadcast(roomId, {
                type: "users",
                users: users(roomId)
            });
        }
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("Room server started");
    console.log("Open: http://localhost:" + PORT);
});
