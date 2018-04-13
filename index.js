const config = require('./lib/config');

const configData = config.load();

const program = require('commander');
const colors = require('colors/safe');
const path = require('path');

const pkg = require('./package.json');
const auth = require('./lib/auth');
const rateLimit = require('./lib/rate-limit');
const count = require('./lib/count');
const deleteAll = require('./lib/delete-all');
const create = require('./lib/create');

function onError(err) {
  console.log(colors.red('Error:'));
  console.log(err.message || err);
}

program
  .version(pkg.version, '-v, --version')
  .description('A CLI for managing SAML connections in Auth0');

program
  .command('login')
  .description('Obtain authorization via the prompted credentials')
  .action(() => auth.login()
    .then((completed) => {
      if (completed) {
        console.log(colors.cyan('Authentication successful!'));
      } else {
        console.log(colors.yellow('\nAuthentication cancelled.'));
      }
    })
    .catch(onError));

program
  .command('config')
  .description('Displays summary of current configuration')
  .action(() => {
    if (config.load()) {
      console.log(`${colors.gray('Source')}: ${colors.cyan(config.path)}\n`);

      const displayConfig = config.load();
      // hide secrets
      delete displayConfig.CLIENT_SECRET;
      delete displayConfig.ACCESS_TOKEN;

      Object.keys(displayConfig).forEach((key) => {
        console.log(`${colors.gray(key)}: ${displayConfig[key]}`);
      });
      console.log('(secrets hidden)');
    } else {
      console.log(colors.yellow('No configuration. Try to login first.'));
    }
  });

program
  .command('rate-limit')
  .description('Set rate limits when calling the Auth0 Management API')
  .action(() => rateLimit.set()
    .then((completed) => {
      if (completed) {
        console.log(colors.cyan('Rate limit configured'));
      } else {
        console.log(colors.yellow('\nLimit prompt cancelled.'));
      }
    })
    .catch(onError));

// commands that can only be run if we have an access token
if (configData && configData.ACCESS_TOKEN) {
  program
    .command('logout')
    .description('Remove current authorization configuration (deletes configuration file)')
    .action(() => auth.logout()
      .then(() => console.log(colors.cyan('You have been logged out.')))
      .catch(onError));

  program
    .command('refresh')
    .description('Refresh authorization token')
    .action(() => auth.refresh()
      .then(() => console.log(colors.cyan('Access token refreshed!')))
      .catch(onError));

  program
    .command('count')
    .description('Get a count of your SAML connections')
    .action(() => {
      count()
        .then(c => console.log(c))
        .catch(onError);
    });

  program
    .command('delete-all')
    .description('Delete all your SAML connections')
    .action(() => {
      deleteAll()
        .then(() => console.log(colors.cyan('All SAML connections deleted.')))
        .catch(onError);
    });

  program
    .command('create <metadata>')
    .option('-e, --entity_id [eid]',
      'SAML SP Entity ID')
    .option('-l, --limit [limit]',
      'Only process the first [limit] entities',
      val => parseInt(val, 10))
    .option('-c, --clients [clientIds]',
      'The client_ids of the clients for which to enable the created connections',
      val => val.split(','), [])
    .description('Create SAML connections from a metadata file')
    .action((metadata, cmd) => {
      const metadataPath = path.resolve(metadata);

      create(metadataPath, cmd.entity_id, cmd.limit, cmd.clients)
        .then(c => console.log(colors.cyan(`${c} SAML connection(s) created.`)))
        .catch(onError);
    });
}

program.parse(process.argv);

// display help by default
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
