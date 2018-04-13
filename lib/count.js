const fetchAll = require('./fetch-all');

module.exports = () =>
  fetchAll()
    .then(connections => connections.length);
