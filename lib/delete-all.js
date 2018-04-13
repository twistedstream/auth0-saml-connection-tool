const request = require('request-promise');

const fetchAll = require('./fetch-all');
const rateLimit = require('./rate-limit');

module.exports = () =>
  fetchAll()
    .then((connections) => {
      console.log(`Connections found: ${connections.length}`);

      return Promise.all(connections.map(connection =>
        rateLimit.limiter.schedule(() =>
          request.delete({
            url: `https://${process.env.AUTH0_DOMAIN}/api/v2/connections/${connection.id}`,
            auth: { bearer: process.env.ACCESS_TOKEN },
            json: true
          })
            .then(() => console.log(`Deleted: ${connection.id} (${connection.name})`)))));
    });
