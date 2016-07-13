var OpenBCIBoard = require('openbci').OpenBCIBoard,
    ourBoard = new OpenBCIBoard({
        verbose:true,
        timeSync: true // Sync up with NTP servers in constructor
    }),
    fs = require('fs'),
    wstreamSample = fs.createWriteStream('timeSyncTest-samples.txt'),
    sys = require('sys'),
    exec = require('child_process').exec;

var child;

var portNames = {
    host: '/dev/cu.usbserial-DB00JAKZ'
}

const sampleRate = 250;
var runTimeSec = 10; //seconds
var totalSamplesToGet = sampleRate * runTimeSec;
var rawSampleCount = 0;
var sampleRecievedCounter = 0;
var timeSentHighArray = [];
var timeSentLowArray = [];
var lastTimeSent = 0;
var cycleTimeMS = 500;
var isCycleHigh = false;
var cycleCount = 0;

console.log("__dir__",__dir__);


var endKindly = () => {
    if (ourBoard.connected) {
        ourBoard.disconnect()
            .then(() => {
                process.exit();
            })
            .catch(err => {
                $log.error(err);
                process.exit();
            });
    } else {
        process.exit();
    }
}

var startRubyScreenFlasher = () => {
    child = exec('ruby taco',
        (error, stdout, stderr) => {
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
            if (error !== null) {
                console.log(`exec error: ${error}`);
            }
    });
}

var startHost = () => {
    ourBoard.connect(portNames.host).then(() => {
        ourBoard.on('ready',function() {
                ourBoard.streamStart()
                    .catch(err => {
                        endKindly();
                    })
            });

        var timeSyncActivated = false;
        ourBoard.on('sample',function(sample) {
            // If we are not sycned, then do that
            if (timeSyncActivated === false) {
                timeSyncActivated = true;
                ourBoard.syncClocks().then(() => {
                    // Jump for joy?
                }).catch(err => {
                    endKindly();
                });
            }
            if (sample.hasOwnProperty("timeStamp") && sample.hasOwnProperty("boardTime")) {
                wstreamSample.write(`${sample.timeStamp},${sample.auxData.readInt16BE()},${sample.boardTime}\n`);
                rawSampleCount++;
                if (rawSampleCount >= totalSamplesToGet) {
                    endKindly();
                }
            }
        });
    })
}

// startHost();

process.on('exit', (code) => {
    if (ourBoard) {
        if (ourBoard.connected) {
            ourBoard.disconnect().then(() => {

            });
        }
    }
});
