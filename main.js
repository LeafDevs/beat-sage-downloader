const fs = require('fs');
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const cliProgress = require('cli-progress');
const https = require('https');
const path = require('path');
const readline = require('readline');

const oDir = 'C:/Users/leafa/Desktop/MikuGame/Songs'; // Change this to your output directory this is the output directory for my beat saber game (not offical beat saber)

async function getInfo(videoId) {
  const apiKey = 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc';
  const headers = {
    'X-YouTube-Client-Name': '5',
    'X-YouTube-Client-Version': '19.09.3',
    Origin: 'https://www.youtube.com',
    'User-Agent': 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
    'content-type': 'application/json'
  };

  const body = {
    context: {
      client: {
        clientName: 'IOS',
        clientVersion: '19.09.3',
        deviceModel: 'iPhone14,3',
        userAgent: 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
        hl: 'en',
        timeZone: 'UTC',
        utcOffsetMinutes: 0
      }
    },
    videoId,
    playbackContext: { contentPlaybackContext: { html5Preference: 'HTML5_PREF_WANTS' } },
    contentCheckOk: true,
    racyCheckOk: true
  };

  const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers
  });

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

async function downloadChunk(url, start, end) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          Range: `bytes=${start}-${end}`
        }
      };
  
      https.get(url, options, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      });
    });
  }

  async function downloadYoutubeAudio(videoId) {
    const info = await getInfo(videoId);
    if (info.playabilityStatus.status !== 'OK') throw new Error(info.playabilityStatus.reason);
  
    const formats = info.streamingData.adaptiveFormats;
    const audioFormat = formats.find(format => format.mimeType.startsWith('audio/'));
    if (!audioFormat) throw new Error('No audio format found');
  
    const ext = audioFormat.mimeType.split('/')[1].split(';')[0];
    const safeTitle = info.videoDetails.title.replace(/\//g, '-');
    const filename = `${safeTitle}-${info.videoDetails.videoId}.${ext}`;
  
    console.log(`Downloading ${filename}`);
  
    const totalSize = parseInt(audioFormat.contentLength, 10);
    const progressBar = new cliProgress.SingleBar({
      format: 'Progress: [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} bytes | Speed: {speed}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    progressBar.start(totalSize, 0, {
      speed: "N/A"
    });
  
    const numChunks = 16; // concurrent downloads
    const chunkSize = Math.ceil(totalSize / numChunks);
    let downloadedSize = 0;
    let startTime = Date.now();
    let lastUpdateTime = startTime;
  
    const promises = [];
  
    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkSize;
      const end = (i + 1) * chunkSize - 1 > totalSize ? totalSize - 1 : (i + 1) * chunkSize - 1;
  
      promises.push(downloadChunk(audioFormat.url, start, end).then(chunk => {
        downloadedSize += chunk.length;
  
        const now = Date.now();
        const timeDiff = now - lastUpdateTime;
        if (timeDiff > 1000) {
          const speed = (chunk.length / timeDiff) * 1000;
          const speedStr = speed > 1024 * 1024
            ? `${(speed / (1024 * 1024)).toFixed(2)} MB/s`
            : `${(speed / 1024).toFixed(2)} KB/s`;
          progressBar.update(downloadedSize, { speed: speedStr });
          lastUpdateTime = now;
        } else {
          progressBar.update(downloadedSize);
        }
        return chunk;
      }));
    }
  
    const chunks = await Promise.all(promises);
    progressBar.stop();
  
    fs.writeFileSync(filename, Buffer.concat(chunks));
    console.log(`Downloaded ${filename}`);
  
    return { filename, title: safeTitle, artist: info.videoDetails.author };
  }

async function uploadToBeatsage(audioPath, title, artist) {
  const audioFile = await fs.promises.readFile(audioPath);
  
  const boundary = "----WebKitFormBoundaryaA38RFcmCeKFPOms";
  const content = new FormData();
  content.append('audio_file', new Blob([audioFile]), path.basename(audioPath));
  content.append('audio_metadata_title', title);
  content.append('audio_metadata_artist', artist);
  content.append('difficulties', 'ExpertPlus');
  content.append('modes', 'Standard,90Degree');
  content.append('events', 'DotBlocks');
  content.append('environment', 'DefaultEnvironment');
  content.append('system_tag', 'v2');

  const response = await fetch('https://beatsage.com/beatsaber_custom_level_create', {
    method: 'POST',
    body: content,
    headers: {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'Host': 'beatsage.com',
      'User-Agent': 'BeatSage-Downloader/1.2.6'
    },
    referrer: 'https://beatsage.com/',
    referrerPolicy: 'strict-origin-when-cross-origin',
    mode: 'cors',
    credentials: 'omit'
  });

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.id;
}

async function createBeatSageLevel(videoId) {
  try {
    const { filename, title, artist } = await downloadYoutubeAudio(videoId);
    const levelId = await uploadToBeatsage(filename, title, artist);
    console.log(`BeatSage level created. Level ID: ${levelId}`);
    
    let levelStatus = "PENDING";
    while (levelStatus === "PENDING") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await fetch(`https://beatsage.com/beatsaber_custom_level_heartbeat/${levelId}`);
      const data = await response.json();
      console.log("WAITING...");
      levelStatus = data.status;
    }

    if (levelStatus === "DONE") {
      const downloadUrl = `https://beatsage.com/beatsaber_custom_level_download/${levelId}`;
      console.log(`Download URL: ${downloadUrl}`);
      

      const response = await fetch(downloadUrl);
      const buffer = await response.arrayBuffer();
      const outputPath = path.join(process.cwd(), `[BSD] ${title} - ${artist}.zip`);
      const zipOutputPath = path.join(oDir, `[BSD] ${title} - ${artist}.zip`);
      await fs.promises.writeFile(zipOutputPath, Buffer.from(buffer));
    
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipOutputPath);
      const extractPath = path.join(oDir, `[BSD] ${title} - ${artist}`);
      zip.extractAllTo(extractPath, true);
      
      const musicFolderPath = path.join(process.cwd(), 'music');
      const destinationPath = path.join(musicFolderPath, `[BSD] ${title} - ${artist}.zip`);
      await fs.promises.rename(zipOutputPath, destinationPath);

      console.log(`File moved to: ${destinationPath}`);
    } else {
      console.error(`Level generation failed. Status: ${levelStatus}`);
    }

    fs.unlinkSync(filename);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function processLinksFile() {
  const fileStream = fs.createReadStream('links.txt');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const videoId = line.trim();
    if (videoId) {
      console.log(`Processing video ID: ${videoId}`);
      await createBeatSageLevel(videoId);
    }
  }
}

// Usage example
processLinksFile();
