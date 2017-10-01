const Eris = require("eris");
const ytdl = require("ytdl-core");
const fs = require("fs");
const logerror = require("./logerror");

if (!fs.existsSync("token.json")) {
    fs.writeFileSync("token.json", JSON.stringify({
        token: "token"
    }));
}

var token = JSON.parse(fs.readFileSync("token.json", "utf8"));

const bot = new Eris.CommandClient(token.token, {}, {
    description: "A music bot made with Eris",
    owner: "TimeTheCat",
    prefix: "m<"
});

var queue = [];
var playlists = new Map();

bot.on('ready', function () {
    console.log("Ready!");
});

bot.registerCommand("play", (msg, args) => {
    if (msg.member.voiceState.channelID === null) {
        msg.channel.createMessage("Please enter a voice channel.").catch(logerror.logerror)
        return;
    }
    bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
        if (connection.playing) {
            bot.createMessage(msg.channel.id, "Added " + args[0] + " to the queue.").then(() => {
                queue.push(new Song(args[0]));
            }).catch(logerror.logerror);
        } else {
            console.log("Playing " + args[0]);
            const stream = ytdl(args[0], {filter: "audioonly"});
            playStream(connection, stream, args[0], msg.channel.id);
        }
    }, logerror.logerror);
}, {
    description: "Play a song",
    usage: "<youtube url>"
});

bot.registerCommand("skip", (msg) => {
    bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
        msg.channel.createMessage("Skipping...").catch(logerror.logerror).then(() => {
            connection.stopPlaying();
            if (queue === undefined) {
                msg.channel.createMessage("No more songs left in queue.").catch(logerror.logerror);
                return
            }
            playStream(connection, queue[0].stream, queue[0].url, msg.member.voiceState.channelID);
        });
    }, logerror.logerror);
});

bot.registerCommand("volume", (msg, args) => {
    bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
        if (args[0] * .01 > 1.0) {
            msg.channel.createMessage("Can't set the volume that high.").catch(logerror.logerror);
        }
        connection.setVolume(args[0] * .01);
        msg.channel.createMessage("Volume set to " + args[0] * .01).catch(logerror.logerror);
    }, logerror.logerror);
});

bot.registerCommand("pause", msg => {
    bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
        if (!connection.paused) {
            msg.channel.createMessage("Pausing playing.").catch(logerror.logerror);
            connection.pause();
        } else if (connection.paused) {
            msg.channel.createMessage("Resuming.").catch(logerror.logerror);
            connection.resume();
        }
    }, logerror.logerror);
});

bot.registerCommand("genplaylist", (msg, args) => {
    let videos = 10;
    if (args[1] !== undefined) {
        videos = args[1];
        console.log("amount not undefined")
    }
    let playlist = [];
    console.log("generating playlist for " + args[0]);
    console.log("amount: " + videos);
    ytdl.getInfo(args[0]).then((t) => {
        let vids = t.related_videos.slice(1, videos + 1);
        for (let i in vids) {
            console.log();
        }
        playlists.set(args[0], playlist);
        msg.channel.createMessage("Generated a playlist for " + args[0] + ". Use m<playlist [video url] to play the list.")
            .catch(logerror.logerror);
    }).catch(p1 => logerror.logerror());
});

bot.registerCommand("playlist", (msg, args) => {
    let playlist = playlists.get(args[0]);
    if (playlist === undefined) {
        msg.channel.createMessage("I don't have a playlist for that.").catch(logerror.logerror);
    } else {
        let new_queue = [];
        for(let i = 0; i >= playlist.length; i++) {
            new_queue = new_queue.push(new Song(playlist[i]));
        }
        bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
            playStream(connection, ytdl(args[0], {filter: "audioonly"}), msg.member.voiceState.channelID);
            queue = new_queue;
        });
    }
});

bot.registerCommand("queue", msg => {
    if (queue.length === 0) {
        msg.channel.createMessage("Queue is empty.").catch(logerror.logerror);
        return;
    }
    let content = "";
    queue.forEach((item) => {
        content += "<" + item.url + ">\n";
    });
    msg.channel.createMessage(content).catch(logerror.logerror);
});

function playStream(connection, stream, url, channel_id) {
    console.log("url " + url);
    connection.play(stream, {
        inlineVolume: true
    });
    console.log("resetting volume...");
    connection.setVolume(0.1);
    bot.createMessage(channel_id, "Now playing: " + url).catch(logerror.logerror);
    connection.once("end", () => {
        console.log("finished playing " + url);
        if (queue.length >= 1) {
            playStream(connection, queue[0].stream, queue[0].url, channel_id);
            queue.shift();
        }
    });
}

function Song(url) {
    this.url = url;
    this.stream = ytdl(url, {filter: "audioonly"});
}

bot.connect();