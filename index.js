import fs from 'fs';
import util from 'util';
import child_process from 'child_process';
const exec = util.promisify(child_process.exec);
import dns from 'dns';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import colors from 'colors';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

process.on('SIGHUP', async () => {
    await destroyServer();
    process.exit();
});

process.on('SIGINT', async () => {
    await destroyServer();
    process.exit();
});

process.on('uncaughtException', (error) => {
    console.error(error);
    pause();
});

const logo = `
██████╗ ███████╗    ███████╗████████╗██████╗ ███████╗ █████╗ ███╗   ███╗███████╗██████╗ 
██╔══██╗██╔════╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔══██╗████╗ ████║██╔════╝██╔══██╗
██████╔╝█████╗█████╗███████╗   ██║   ██████╔╝█████╗  ███████║██╔████╔██║█████╗  ██████╔╝
██╔══██╗██╔══╝╚════╝╚════██║   ██║   ██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║██╔══╝  ██╔══██╗
██║  ██║███████╗    ███████║   ██║   ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║███████╗██║  ██║
╚═╝  ╚═╝╚══════╝    ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝
`;
const version = 'v1.0';
const by = 'By NightStranger\n';

let ip, conf;

main();

async function main() {
    ip = await getIP();
    printLogo();
    if(setupConfig()) {
        await destroyServer();
        startServer();
    }
}

async function startServer() {
    try {
        const { error, stdout, stderr } = exec('chcp 65001 && cd server && server.exe');
        if (error) {
            console.error(`error: ${error.message}`);
            return;
        }
      
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }

        console.log(`Server started on rtmp://${ip} (port: ${conf.port})`.brightGreen);

        console.log(`Restreaming to:`);
        for(let i = 0; i < conf.streams.length; i++) {
            let stream = conf.streams[i];
            stream = stream.split("/")[2];
            console.log(`  ${stream}`);
        }
    } catch (err) {
        pause();
        console.log('Failed to start server:'.red);
        console.log(err);
    }
}

async function destroyServer() {
    try {
        const { error, stdout, stderr } = await exec('taskkill /f /im server.exe');
        if (error) {
            console.error(`error: ${error.message}`);
            return;
        }
      
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
      
        console.log(`Server is offline now`.red);
    } catch (err) {
        console.log(`No servers started.`);
        pause();
    }
}

function getIP() {
    return new Promise((resolve, reject) => {
        dns.lookup(os.hostname(), (err, add, fam) => {
            resolve(add);
        });
    });
}

function setupConfig() {
    try {
        let config = loadConfig();
        if(!config) 
            return false;

        fs.writeFileSync('server/conf/nginx.conf', config);
        return true;
    } catch (err) {
        console.log(`Failed to setup config: ${err}`.red);
        pause();
    }
}

function loadConfig() {
    try {
        let example = fs.readFileSync("conf.example");
        let config;
        if(!fs.existsSync("config.json")){
            config = {
                port: 1935,
                webport: 80,
                streams: [
                    "rtmp://a.rtmp.youtube.com/live2/YOUR_YOUTUBE_KEY",
                    "rtmp://live.twitch.tv/app/YOUR_TWITCH_KEY"
                ]
            };
            fs.writeFileSync("config.json", JSON.stringify(config, null, 4));
            console.log(`Config file is created. Customize it for yourself and restart the program.`.brightCyan);
            pause();
            return false;
        } else {
            config = fs.readFileSync("config.json");
            config = config.toString();
            config = JSON.parse(config);
        }
    
        example = example.toString();
        conf = config;
        
        let push = '';
    
        for(let i = 0; i < config.streams.length; i++) {
            const stream = config.streams[i];
            push += `push ${stream};\r`;
    
            if(i != config.streams.length)
                push += '';
        }
    
        example = example.replace("${port}", config.port);
        example = example.replace("${webport}", config.webport);
        example = example.replace("${push}", push);
    
        return example;
    } catch(err) {
        console.log(`Failed to load config: ${err}`.red);
        pause();
    }
}

function printLogo() {
    console.log(`\x1b[5m${logo}\x1b[0m`);
    console.log(`${version}`.brightCyan);
    console.log(`${by}`.brightMagenta);
}

function pause() {
    setTimeout(() => {}, 1000000);
}