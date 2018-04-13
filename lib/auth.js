const prompt = require('prompt');
const tools = require('auth0-extension-tools');
const config = require('./config');

const schema = {
  properties: {
    AUTH0_DOMAIN: { require: true, default: process.env.AUTH0_DOMAIN },
    CLIENT_ID: { require: true, default: process.env.CLIENT_ID },
    CLIENT_SECRET: { require: true, hidden: true, replace: '*' }
  }
};

function getAccessToken(data) {
  return tools.managementApi.getAccessToken(
    data.AUTH0_DOMAIN,
    data.CLIENT_ID,
    data.CLIENT_SECRET);
}

// prompt the user for new credentials
function login() {
  prompt.message = '';
  prompt.start();

  return new Promise((resolve, reject) => {
    prompt.get(schema, (error, result) => {
      if (error) {
        return resolve(false);
      }

      return getAccessToken(result)
        .then(accessToken => Object.assign({ ACCESS_TOKEN: accessToken }, result))
        .then(config.save)
        .then(() => resolve(true))
        .catch(err => reject(err));
    });
  });
}

// refresh the configured access token
function refresh() {
  return getAccessToken(process.env)
    .then(accessToken => ({ ACCESS_TOKEN: accessToken }))
    .then(config.save);
}

function logout() {
  return config.del();
}

module.exports = {
  login,
  refresh,
  logout
};
