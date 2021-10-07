#!/usr/bin/env node
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const subscene = require('node-subscene');
var AdmZip = require('adm-zip');
const axios = require('axios');
const cliSelect = require('cli-select');
var { Registry } = require('rage-edit');
const { prompt } = require('inquirer');
const headers = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.47 Safari/537.36',
};
async function run() {
  let name = process.argv[2];
  if (process.argv.length > 2) {
    let input = process.argv.slice(2);
    name = input.join('.');
  }
  let videoName = path.parse(name).name;
  let originalName = videoName;
  console.log('searching:', originalName);
  let isTv = false;
  let test = videoName.match(/\S+(s.[1-9])(e.\d)/gi);
  let episode = 0;
  if (test) {
    isTv = true;
    videoName = test[0].match(/\S+(?=.s\d)/gi)[0];
    episode = test[0].replace(videoName + '.', '').split('e')[1];
  }
  let search = await subscene.search(videoName.replace(/_/g, '.'));

  const questions = [
    {
      type: 'select',
      name: 'value',
      message: 'select movie/show name',
      choices: search,
    },
  ];
  let answers = await prompt(questions);
  let selected = search.find((item) => item.title.trim() == answers.value.trim());
  let list = await subscene.getList(selected.url);
  list = list.filter((item) => item.language == 'Farsi/Persian');
  if (isTv) {
    list.sort((a, b) => {
      if (a.title.includes(episode)) return -1;
    });
  } else {
    if (list.length > 20) {
      let originalList = Object.assign(list, []);
      list = list.filter((v, i, a) => a.findIndex((t) => t.title === v.title) === i);
      if (list.length === 0) list = originalList;
    }
  }
  const subtitles = [
    {
      type: 'select',
      name: 'value',
      message: 'select subtitle',
      choices: list,
    },
  ];
  let subtitleChoice = await prompt(subtitles);
  let selectedSubtitle = list.find((item) => item.title.trim() == subtitleChoice.value.trim());
  let dlURL = await subscene.getDownloadLink(selectedSubtitle.url);
  extract(dlURL, originalName);
  // cliSelect(
  //   {
  //     values: search.map((item) => item.title),
  //     valueRenderer: (value, selected) => {
  //       if (selected) {
  //         return chalk.yellow(value);
  //       }
  //       return value;
  //     },
  //   },
  //   async (item) => {
  //     if (item.id !== null) {
  //       let list = await subscene.getList(search[item.id].url);
  //       list = list.filter((item) => item.language == 'Farsi/Persian');
  //       if (isTv) {
  //         list.sort((a, b) => {
  //           if (a.title.includes(episode)) return -1;
  //         });
  //       } else {
  //         if (list.length > 20) {
  //           let originalList = Object.assign(list, []);
  //           list = list.filter((v, i, a) => a.findIndex((t) => t.title === v.title) === i);
  //           if (list.length === 0) list = originalList;
  //         }
  //       }

  //       cliSelect(
  //         {
  //           values: list.map((item) => item.title),
  //           valueRenderer: (value, selected) => {
  //             if (selected) {
  //               return chalk.yellow(value);
  //             }
  //             return value;
  //           },
  //         },
  //         async (selected) => {
  //           if (selected.id !== null) {
  //             let sub = list[selected.id].url;
  //             let dlURL = await subscene.getDownloadLink(sub);
  //             extract(dlURL, originalName);
  //           }
  //         }
  //       );
  //     }
  //   }
  // );
}

const extract = (url, name) => {
  return new Promise(async (resolve, reject) => {
    let result = await axios.get(url, { headers: headers, responseType: 'arraybuffer' });
    var zip = new AdmZip(result.data);
    var zipEntries = zip.getEntries();
    if (zipEntries.length > 1) {
      fs.writeFileSync(`${name}.zip`, result.data);
      return true;
    }
    zipEntries.forEach((item, i) => {
      fs.writeFileSync(name + '.srt', item.getData());
      // fs.writeFileSync(i+1+'.srt', item.getData());
    });

    return resolve();
  });
};

if (process.argv[2]) run();

const registerContextMenu = async () => {
  let appPath = path.resolve(process.cwd(), 'subtitle.exe');
  let hasKey = await Registry.get(
    'HKEY_CURRENT_USER\\Software\\Classes\\*\\shell\\DownloadSubtitle\\command'
  );
  if (!hasKey) {
    // console.log('first time run');
    // console.log('adding key to registry');
    // Registry.delete('HKEY_CURRENT_USER\\Software\\Classes\\*\\shell\\DownloadSubtitle\\command')
    Registry.set(
      'HKEY_CURRENT_USER\\Software\\Classes\\*\\shell\\DownloadSubtitle',
      '',
      `Download Subtitle`
    ).catch((e) => console.log(e));
    Registry.set(
      'HKEY_CURRENT_USER\\Software\\Classes\\*\\shell\\DownloadSubtitle\\command',
      '',
      `C:\\Windows\\System32\\cmd.exe /k ${appPath} '%1' `
    ).catch((e) => console.log(e));
  }
};
registerContextMenu();

//pkg index.js --target node14-win-x64 --compress Brotli -o
//TODO: works without context


// (Hi10)_Monster_-_01_(DVD_480p)_(Figmentos)