const dotenv = require('dotenv');
const os = require('os');
const path = require('path');
const fs = require('fs');

const pkg = require('../package.json');

const configPath = path.resolve(os.homedir(), `.${pkg.name}.env`);

// loads configuration
function load() {
  return dotenv.config({ path: configPath }).parsed;
}

// save the specified data to the config file, merging with existing data
function save(newData) {
  // load current data
  const currentData = load() || {};
  // merge
  const data = Object.assign(currentData, newData);

  // delete previous config file
  try {
    fs.unlinkSync(configPath);
  } catch (err) {
    // do nothing
  }

  // save new file
  const text = Object.keys(data).reduce((acc, key) => `${acc}${key}=${data[key]}\n`, '');
  return new Promise((resolve, reject) => {
    fs.writeFile(configPath, text, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
}

// delete the configuration file
function del() {
  return new Promise((resolve, reject) => {
    fs.unlink(configPath, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
}

module.exports = {
  path: configPath,
  load,
  save,
  del
};
