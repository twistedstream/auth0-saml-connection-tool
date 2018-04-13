const Bottleneck = require('bottleneck');
const prompt = require('prompt');
const config = require('./config');

// default limits = Auth0's Management API rate limit for free tenant (2 req/sec)
process.env.API_RATE_MAX_CONCURRENT = process.env.API_RATE_MAX_CONCURRENT || 2;
process.env.API_RATE_MIN_TIME = process.env.API_RATE_MIN_TIME || 1000;

const schema = {
  properties: {
    API_RATE_MAX_CONCURRENT: { require: true, type: 'integer', default: process.env.API_RATE_MAX_CONCURRENT },
    API_RATE_MIN_TIME: { require: true, type: 'integer', default: process.env.API_RATE_MIN_TIME }
  }
};

const limiter = new Bottleneck({
  maxConcurrent: parseInt(process.env.API_RATE_MAX_CONCURRENT, 10),
  minTime: parseInt(process.env.API_RATE_MIN_TIME, 10)
});

// prompt the user for new rate limit configuration
function set() {
  prompt.message = '';
  prompt.start();

  return new Promise((resolve, reject) => {
    prompt.get(schema, (error, result) => {
      if (error) {
        return resolve(false);
      }

      return config.save(result)
        .then(() => resolve(true))
        .catch(err => reject(err));
    });
  });
}

module.exports = {
  limiter,
  set
};
