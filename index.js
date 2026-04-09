#!/usr/bin/env node

const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs');
const { searchiTunes } = require('./lib/itunes');
const { searchYouTube, downloadYouTubeAudioWithTemp } = require('./lib/youtube');
const { mergeMetadata } = require('./lib/merger');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node index.js "song name" [itunes_limit] [youtube_limit]');
    console.log('Example: node index.js "Shape of You" 5 5');
    console.log('');
    console.log('Options:');
    console.log('  itunes_limit   - Number of iTunes results (3, 5, or 10). Default: 3');
    console.log('  youtube_limit  - Number of YouTube results (3, 5, or 10). Default: 3');
    process.exit(1);
  }

  const query = args[0];
  const itunesLimit = [3, 5, 10].includes(parseInt(args[1])) ? parseInt(args[1]) : 3;
  const youtubeLimit = [3, 5, 10].includes(parseInt(args[2])) ? parseInt(args[2]) : 3;

  console.log('\n=== Searching iTunes ===');
  const itunesResults = await searchiTunes(query, itunesLimit);
  
  if (itunesResults.length === 0) {
    console.log('No results from iTunes.');
    process.exit(1);
  }

  const itunesChoices = itunesResults.map((track, idx) => 
    `${idx + 1}. ${track.name} - ${track.artist} (${track.album})`
  );

  const itunesAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'itunesSelection',
      message: 'Select iTunes track:',
      choices: itunesChoices
    }
  ]);

  const itunesIndex = itunesChoices.indexOf(itunesAnswers.itunesSelection);
  const selectediTunes = itunesResults[itunesIndex];

  console.log(`\nSelected: ${selectediTunes.name} - ${selectediTunes.artist}`);
  console.log(`Album: ${selectediTunes.album}`);

  const ytQuery = `${selectediTunes.artist} ${selectediTunes.name} official audio`;
  console.log(`\n=== Searching YouTube for: "${ytQuery}" ===`);
  
  const youtubeResults = await searchYouTube(ytQuery, youtubeLimit);
  
  if (youtubeResults.length === 0) {
    console.log('No results from YouTube.');
    process.exit(1);
  }

  const youtubeChoices = youtubeResults.map((video, idx) => 
    `${idx + 1}. ${video.title} (${video.duration || 'N/A'})`
  );

  const youtubeAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'youtubeSelection',
      message: 'Select YouTube video:',
      choices: youtubeChoices
    }
  ]);

  const youtubeIndex = youtubeChoices.indexOf(youtubeAnswers.youtubeSelection);
  const selectedYoutube = youtubeResults[youtubeIndex];

  console.log(`\nSelected: ${selectedYoutube.title}`);
  console.log('\n=== Downloading audio from YouTube ===');

  const tempAudioPath = await downloadYouTubeAudioWithTemp(selectedYoutube.url);
  
  if (!tempAudioPath) {
    console.log('Failed to download audio.');
    process.exit(1);
  }

  console.log('Audio downloaded successfully.');

  const safeArtist = selectediTunes.artist.replace(/[<>:"/\\|?*]/g, '').trim();
  const safeTitle = selectediTunes.name.replace(/[<>:"/\\|?*]/g, '').trim();
  const safeAlbum = selectediTunes.album.replace(/[<>:"/\\|?*]/g, '').trim();
  const safeOutputFileName = `${safeArtist} - ${safeTitle}.mp3`;
  const outputPath = path.join(process.cwd(), safeOutputFileName);

  console.log('\n=== Merging metadata and album art ===');

  const metadata = {
    title: selectediTunes.name,
    artist: selectediTunes.artist,
    album: selectediTunes.album,
    albumArt: selectediTunes.albumArt
  };

  try {
    await mergeMetadata(tempAudioPath, metadata, outputPath);
    console.log(`\n=== SUCCESS ===`);
    console.log(`File saved: ${outputPath}`);
    console.log(`Title: ${metadata.title}`);
    console.log(`Artist: ${metadata.artist}`);
    console.log(`Album: ${metadata.album}`);
  } catch (err) {
    console.error('Error merging metadata:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
