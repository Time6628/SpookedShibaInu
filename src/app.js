const Eris = require("eris");
const ytdl = require("ytdl-core");
const fs = require("fs");
const logerror = require("./logerror");

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

bot.on('ready', function () {
    console.log("Ready!");
});

bot.registerCommand("play", (msg, args) => {
    if (msg.member.voiceState.channelID === null) {
        msg.channel.createMessage("Please enter a voice channel.").catch(logerror.logerror);
        return;
    }
    bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
        if (connection.playing) {
            try {
                bot.createMessage(msg.channel.id, "Added " + args[0] + " to the queue.").then(() => {
                    queue.push(new Song(args[0]));
                }).catch(logerror.logerror);
            } catch (error) {
                bot.createMessage(msg.channel.id, "Added " + args[0] + " to the queue.").catch(logerror.logerror)
            }
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
    if (msg.member.voiceState.channelID === null) {
        msg.channel.createMessage("Please join the voice channel first.").catch(logerror.logerror);
        return;
    }
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
    if (msg.member.voiceState.channelID === null) {
        msg.channel.createMessage("Please join the voice channel first.").catch(logerror.logerror);
        return;
    }
    bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
        if (args[0] * .01 > 1.0) {
            msg.channel.createMessage("Can't set the volume that high.").catch(logerror.logerror);
        }
        connection.setVolume(args[0] * .01);
        msg.channel.createMessage("Volume set to " + args[0] * .01).catch(logerror.logerror);
    }, logerror.logerror);
});

bot.registerCommand("pause", msg => {
    if (msg.member.voiceState.channelID === null) {
        msg.channel.createMessage("Please join the voice channel first.").catch(logerror.logerror);
        return;
    }
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
    if (stream === null || stream === undefined) {
        bot.createMessage(channel_id, "Unable to play video.").catch(logerror.logerror);
        if (queue.length >= 1) {
            playStream(connection, queue[0].stream, queue[0].url, channel_id);
            queue.shift();
        }
        return;
    }

    console.log("url " + url);

    connection.on("error", (err) => {
        bot.getChannel(channel_id).createMessage(err.message).catch(logerror.logerror)
    });

    connection.on("warn", (err) => {
        logerror.logerror(err);
    });

    connection.play(stream, {
        inlineVolume: true
    });

    console.log("resetting volume...");
    connection.setVolume(0.1);
    bot.createMessage(channel_id, "Now playing: " + url).catch(logerror.logerror);

    connection.once("end", () => {
        console.log("finished playing " + url);
        if (queue.length >= 1) {
            stream.destroy();
            playStream(connection, queue[0].stream, queue[0].url, channel_id);
            queue.shift();
        }
    });
}

function Song(url) {
    this.url = url;
    this.stream = ytdl(url, {filter: "audioonly"}).on("error", logerror.logerror);
}

bot.connect();