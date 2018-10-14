"use strict";

const Eris = require("eris");
const ytdl = require("ytdl-core");
const fs = require("fs");

if (!fs.existsSync("token.json")) {
    fs.writeFileSync("token.json", JSON.stringify({
        token: "token"
    }));
}

const token = JSON.parse(fs.readFileSync("token.json", "utf8"));

const bot = new Eris.CommandClient(token.token, {}, {
    description: "A music bot made with Eris",
    owner: "TimeTheCat",
    prefix: "m<"
});

let queue = [];

let players = [];

bot.on('ready', function () {
    console.log("Ready!");
});

bot.registerCommand("play", (msg, args) => {
    if (msg.member.voiceState.channelID === null) {
        msg.channel.createMessage("Please enter a voice channel.").catch(console.error);
        return;
    }
    if (args[1] !== undefined && args[1] * .01 > 2.0 && msg.author.id !== "71371505652477952") {
        msg.channel.createMessage("Can't set the volume that high.").catch(console.error);
        return;
    } else if (args[1] !== undefined && isNaN(parseInt(args[1], 10))) {
        msg.channel.createMessage("That's not a valid volume.").catch(console.error);
        return;
    }
    bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
        if (connection.playing) {
            bot.createMessage(msg.channel.id, "Added " + args[0] + " to the queue.").then(() => {
                queue.push(new Song(args[0], args[1]));
            }).catch(console.error);
        } else {
            console.log("Playing " + args[0] + " at " + args[1] + " volume.");
            players[connection] = new Player(connection, args[0], msg.channel, args[1]);
        }
    }, console.error);
}, {
    description: "Play a song",
    usage: "<youtube url>"
});

bot.registerCommand("skip", (msg) => {
    if (msg.member.voiceState.channelID === null) {
        msg.channel.createMessage("Please join the voice channel first.").catch(console.error);
        return;
    }
    bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
        msg.channel.createMessage("Skipping...").catch(console.error).then(() => {
            players[connection].skip();
        });
    }, console.error);
}, {
    guildOnly: true
});

bot.registerCommand("volume", (msg, args) => {
    if (args[0] !== undefined && isNaN(parseInt(args[0], 10))) return;
    if (msg.member.voiceState.channelID === null) {
        msg.channel.createMessage("Please join the voice channel first.").catch(console.error);
        return;
    }
    bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
        if (args[0] * .01 > 2.0 && msg.author.id !== "71371505652477952") {
            msg.channel.createMessage("Can't set the volume that high.").catch(console.error);
            return;
        }
        connection.setVolume(args[0] * .01);
        msg.channel.createMessage("Volume set to " + args[0] * .01).catch(console.error);
    }, console.error);
}, {
    aliases: ["vol"],
    argsRequired: true,
    guildOnly: true
});

bot.registerCommand("pause", msg => {
    if (msg.member.voiceState.channelID === null) {
        msg.channel.createMessage("Please join the voice channel first.").catch(console.error);
        return;
    }
    bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
        if (!connection.paused) {
            msg.channel.createMessage("Pausing playing.").catch(console.error);
            connection.pause();
        } else if (connection.paused) {
            msg.channel.createMessage("Resuming.").catch(console.error);
            connection.resume();
        }
    }, console.error);
}, {
    argsRequired: true,
    guildOnly: true
});

bot.registerCommand("queue", msg => {
    if (queue.length === 0) {
        msg.channel.createMessage("Queue is empty.").catch(console.error);
        return;
    }
    let content = "";
    queue.forEach((item) => {
        content += "<" + item.url + ">\n";
    });
    msg.channel.createMessage(content).catch(console.error);
}, {
    argsRequired: true,
    guildOnly: true
});

function Player(connection, url, channel, volume) {
    this.connection = connection;
    this.song = new Song(url, volume);
    this.channel = channel;

    this.playStream = function () {
        if (this.song.stream === null || undefined) {
            bot.createMessage(this.channel_id, "Unable to play video.").catch(console.error);
            this.nextInQueue();
            return;
        }
        this.connection.on("error", console.error);
        this.connection.on("warn", console.error);
        //this.connection.on("debug", console.debug);
        this.connection.play(this.song.stream, {
            inlineVolume: true
        });
        this.connection.setVolume(this.song.volume);
        this.channel.createMessage("Now playing: " + this.song.url).catch(console.error);
        this.connection.once("end", () => {
            console.log("finished playing " + url);
            this.nextInQueue();
        });
    };

    this.skip = function () {
        this.connection.stopPlaying();
    };

    this.nextInQueue = function () {
        if (queue.length >= 1) {
            this.song.stream.destroy();
            this.updatePlayer(queue[0]);
            queue.shift();
            this.playStream();
        } else {
            bot.leaveVoiceChannel(connection.channelID);
        }
    };

    this.updatePlayer = function (newSong) {
        this.song = newSong;
    };

    this.playStream();
}

function Song(url, volume) {
    this.url = url;
    this.stream = ytdl(url, {filter: "audioonly"}).on("error", console.error);
    this.volume = isNaN(volume) ? 1.0 : volume * .01;
}

bot.connect();