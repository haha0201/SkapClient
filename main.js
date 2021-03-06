if (localStorage.getItem("username")) {
    username.value = localStorage.getItem("username");
}
if (localStorage.getItem("password")) {
    password.value = localStorage.getItem("password");
}

ws.addEventListener("open", () => {
    if (localStorage.getItem("cookie")) {
        send({
            e: "session",
            cookie: localStorage.getItem("cookie")
        });
    }
    login.addEventListener("click", () => {
        send({
            e: "login",
            m: {
                username: username.value,
                password: SHA256(username.value + password.value)
            }
        });
    });
    logout.addEventListener("click", () => {
        send({
            e: "logout"
        });
    });
    guest.addEventListener("click", () => {
        send({
            e: "guest"
        });
    });
    play.addEventListener("click", () => {
        send({
            e: "games"
        });
    });
    refresh.addEventListener("click", () => {
        send({
            e: "games"
        });
    });
    chatInput.addEventListener("keydown", e => {
        e.cancelBubble = true;
        if (e.key === "Enter" && !e.shiftKey) {
            if (chatInput.value !== "") {
                /**
                 * @type {string}
                 */
                let msg = chatInput.value;
                for (let i of seriousProfanCheck) {
                    if (msg.toLowerCase().match(i)) {
                        window.location.replace(window.location.pathname.slice(0, window.location.pathname.length - 10) + "bad.html")
                    }
                }
                if (bypassProfan) {
                    for (let i of profanCheck) {
                        let match = msg.match(new RegExp(i, "gi"));
                        if (match) {
                            for (let m of match) {
                                msg = msg.replace(m, m[0] + "\u200C" + m.slice(1));
                            }
                        }
                    }
                }
                send({
                    e: "message",
                    message: msg
                });
                chatInput.value = "";
            }
            chatInput.blur();
        }
    });
    chatInput.addEventListener("focus", () => {
        chatFocus = true;
    });
    chatInput.addEventListener("blur", () => {
        chatFocus = false;
    });
    // Handle game controls
    document.addEventListener("keydown", e => {
        if (!chatFocus) {
            if (keys.includes(e.key.toLowerCase())) {
                send({
                    e: "input",
                    input: {
                        keys: keys.indexOf(e.key.toLowerCase()),
                        value: true
                    }
                });
            }
        }
    });
    document.addEventListener("keyup", e => {
        if (keys.includes(e.key.toLowerCase())) {
            send({
                e: "input",
                input: {
                    keys: keys.indexOf(e.key.toLowerCase()),
                    value: false
                }
            });
        }
    });
});
ws.addEventListener("message", e => {
    let msg = JSON.parse(e.data);
    if (viewWS && (!noUS || msg.e !== "updateStates")) wsDiv.innerHTML = e.data;
    switch (msg.e) {
        case "result":
            if (!msg.m) {
                if (msg.cookie !== "") {
                    localStorage.setItem("cookie", msg.cookie);
                    localStorage.setItem("username", username.value);
                    localStorage.setItem("password", password.value);
                }
                customAlert(msg.t.safe());
                hide(loginData);
                show(logoutDiv);
            } else {
                customAlert(msg.t);
            }
            break;
        case "logout":
            show(loginDiv);
            hide(logoutDiv);
            show(loginData);
            hide(gamesDiv);
            customAlert("Logout");
            break;
        case "games":
            gameListDiv.innerHTML = "";
            msg.g.forEach(g => {
                let div = document.createElement("div");
                div.className = "gameDisplay";
                if (g.private) div.classList.add("private");
                div.innerHTML = `<h2>${g.name}<br>${g.players} players</h2><h5>${g.id}</h5><p>${g.mapName.safe()} by ${g.creator.safe()}</p>`;
                div.addEventListener("click", () => {
                    if (g.private) {
                        send({
                            e: "join",
                            g: g.id,
                            p: prompt("Password?")
                        });
                    } else send({
                        e: "join",
                        g: g.id
                    });
                    console.log(g.id);
                });
                gameListDiv.appendChild(div);
            });
            hide(loginDiv);
            show(gamesDiv);
            break;
        case "join":
            if (msg.m) customAlert("Could not join game");
            else {
                initMap(msg.i.map);
                hide(gamesDiv);
                show(gameDiv);
                setInterval(() => {
                    window.requestAnimationFrame(fps => {
                        let calcFPS = Math.floor(1000 / (fps - lastFrame));
                        if (calcFPS != Infinity) FPSDisplay.innerHTML = calcFPS;
                        lastFrame = fps;
                        render(data, map);
                    });
                }, 15);
                customAlert("Joined game");
            }
            break;
        case "message":
            let scroll = chat.lastElementChild ? chat.scrollTop + chat.clientHeight + 6 >= chat.scrollHeight : true;
            console.log(chat.scrollTop  + chat.clientHeight + 6, chat.scrollHeight);
            chat.innerHTML += `<p class="${msg.m.s === "[SKAP]" ? "SKAPMsg" : ["guestMsg", "userMsg", "modMsg"][msg.m.r + 1]}">${msg.m.s.safe()}:&nbsp;${msg.m.m.safe()}</p>`;
            if (scroll) chat.lastElementChild.scrollIntoView();
            break;
        case "updateStates":
            updateStates(msg.m);
            break;
        case "initMap":
            initMap(msg.m);
            break;
        case "updateMap":
            if (msg.m.update)
                for (let u of msg.m.update)
                    for (let o in map.objects)
                        if (map.objects[o].id === u.id) {
                            map.objects[o] = u;
                            break;
                        }
            if (msg.m.add)
                map.objects = map.objects.concat(msg.m.add);
            if (msg.m.remove)
                for (let r of msg.m.remove)
                    for (let o in map.objects)
                        if (map.objects[o].id === r.id)
                            map.objects.splice(o);
            break;
    }
});
function initMap(i) {
    map = i;
    fill.obstacle = "rgba(" +
        (240 + (i.backgroundColor[0] - 240) * i.backgroundColor[3]) + ", " +
        (240 + (i.backgroundColor[1] - 240) * i.backgroundColor[3]) + ", " +
        (240 + (i.backgroundColor[2] - 240) * i.backgroundColor[3]) + ", 1)";
}
ws.addEventListener("close", () => {
    hide(gameDiv);
    customAlert("The WebSocket closed for unknown reasons.<br>Please reload the client. If that doesn't work, try again later.<br>Skap may have been taken down for maintenence", 100);
});
document.addEventListener("keydown", e => {
    if (!e.repeat) {
        if (!chatFocus) switch (e.key.toLowerCase()) {
            case "o":
                if (viewWS) {
                    viewWS = false;
                    customAlert("WS messages HIDDEN");
                    hide(wsDiv);
                } else {
                    viewWS = true;
                    customAlert("WS messages SHOWN<br><small>Note: Is spammy</small>");
                    show(wsDiv);
                }
                localStorage.setItem("viewWS", viewWS ? "on" : "");
                break;
            case "f":
                if (freeCam) {
                    customAlert("Freecam OFF");
                    freeCam = false;
                } else {
                    customAlert("Freecam ON");
                    freeCam = true;
                }
                break;
            case "u":
                camScale /= 1.5;
                customAlert(`Camera Scale: ${camScale}`);
                break;
            case "i":
                camScale *= 1.5;
                customAlert(`Camera Scale: ${camScale}`);
                break;
            case "enter":
                if (!chatFocus) {
                    chatInput.focus();
                }
                break;
        }
    }
});