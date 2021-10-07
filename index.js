#!/usr/bin/env node
const fs = require('fs');
const chalk = require('chalk');
// const figures = require('figures')
var regedit = require('regedit');

const subscene = require('node-subscene');
const headers = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.47 Safari/537.36',
};
async function run() {
  const name = process.argv[2];
  const path = require('path');
  let videoName = path.parse(name).name;
  let originalName = videoName;
  console.log('searching:', originalName);
  let isTv = false;
  let test = videoName.match(/\S+(s.[1-9])(e.\d)/gi);
  let episode = 0;
  if (test) {
    isTv = true;
    videoName = test[0].match(/\S+(?=.s\d)/g)[0];
    episode = test[0].replace(videoName + '.', '').split('e')[1];
  }
  let search = await subscene.search(videoName);
  cliSelect(
    {
      values: search.map((item) => item.title),
      valueRenderer: (value, selected) => {
        if (selected) {
          return chalk.yellow(value);
        }
        return value;
      },
    },
    async (item) => {
      if (item.id !== null) {
        let list = await subscene.getList(search[item.id].url);
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

        cliSelect(
          {
            values: list.map((item) => item.title),
            valueRenderer: (value, selected) => {
              if (selected) {
                return chalk.yellow(value);
              }
              return value;
            },
          },
          async (selected) => {
            if (selected.id !== null) {
              let sub = list[selected.id].url;
              let dlURL = await subscene.getDownloadLink(sub);
              extract(dlURL, originalName);
            }
          }
        );
      }
    }
  );
}

var AdmZip = require('adm-zip');
const axios = require('axios');
const cliSelect = require('cli-select');

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

// run();
const { exec } = require('child_process');
var elevate = require('windows-elevate');

//TODO: add to registry C:\Windows\System32\cmd.exe /k subtitle "%1"
const registerContextMenu = () => {
  exec(
    `reg query HKEY_CLASSES_ROOT\\*\\shell\\subtitle\\command`,
    function (error, stdout, stderror) {
      if (error) {
        // console.log("🚀 ~ file: index.js ~ line 106 ~ error", error)
        //no registry try to add:
        elevate.exec(
          `reg add "HKEY_CLASSES_ROOT\*\shell\subtitle\command" /f /d "C:\\Windows\\System32\\cmd.exe /k subtitle '%1'"`,
          function (error, stdout, stderror) {
            console.log(
              '🚀 ~ file: index.js ~ line 111 ~ error, stdout, stderror',
              error,
              stdout,
              stderror
            );
            if (error) {
              console.error('Failed!');
              return;
            }

            console.log('Success!');
          }
        );
        // console.error('Failed!',error);
        // return;
      }

      console.log('Success!', stdout);
    }
  );
};
registerContextMenu();
// reg add HKEY_CLASSES_ROOT\*\shell\subtitle\command /f /d "C:\Windows\System32\cmd.exe /k subtitle '%1'"
var escapeShell = function (cmd) {
  return '"' + cmd.replace(/(["'$`\\])/g, '\\$1') + '"';
};
