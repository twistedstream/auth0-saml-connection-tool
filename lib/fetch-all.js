const request = require('request-promise');

const rateLimit = require('./rate-limit');

module.exports = () =>
  rateLimit.limiter.schedule(() =>
    request.get({
      url: `https://${process.env.AUTH0_DOMAIN}/api/v2/connections`,
      qs: {
        strategy: 'samlp',
        fields: 'id,name'
      },
      auth: { bearer: process.env.ACCESS_TOKEN },
      json: true
    }));
