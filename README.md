# 🎵 YouTube to Beat Saber Converter 🕹️

This script allows you to download YouTube audio and automatically convert it into Beat Saber custom levels using BeatSage. It's a powerful tool for Beat Saber enthusiasts who want to quickly create custom levels from their favorite YouTube music videos.

## 🚀 Quick Start

1. Clone this repository
2. Run `npm install` to install dependencies
3. Add YouTube video IDs to `links.txt`
4. Run the script with `node main.js`

## 📋 Prerequisites

- Node.js installed on your system
- A YouTube API key (already included in the script)

## 🔧 Configuration

### YouTube Video IDs

Add the YouTube video IDs to the `links.txt` file, one per line. To get the video ID:

1. Go to the YouTube video
2. Look at the URL: `https://www.youtube.com/watch?v=DmmYAX8Phig`
3. The part after `v=` is the video ID: `DmmYAX8Phig`

### Changing Output Directories

To change where the Beat Saber levels are saved:

1. Open `main.js`
2. Find the following lines:
   ```javascript
   const oDir = 'C:/Users/leafa/Desktop/MikuGame/Songs';
   ```
3. Replace the paths with your desired output directory

## 🎮 Features

- 📥 Downloads audio from YouTube videos
- 🎵 Converts audio to Beat Saber custom levels using BeatSage
- 🗃️ Automatically extracts and organizes the custom levels
- 📊 Displays progress bars and download speeds

## ⚠️ Disclaimer

This tool is for personal use only. Respect copyright laws and YouTube's terms of service.

## 🤝 Contributing

Feel free to fork this project and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Happy Beat Sabering! 🎶🥳
