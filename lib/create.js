const util = require('util');
const fs = require('fs');
const { URL } = require('url');
const DOMParser = require('xmldom').DOMParser;
const xmlSerializer = require('xmlserializer');
const request = require('request-promise');
const _ = require('lodash');

const rateLimit = require('./rate-limit');

const SUPPORTED_BINDINGS = [
  'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
  'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST'
];

const readFile = util.promisify(fs.readFile);

module.exports = (metadataPath, spEntityId, limit, enabledClients) =>
  readFile(metadataPath, 'utf8')
    .then((data) => {
      // find entity elements
      const doc = new DOMParser().parseFromString(data);
      const entitiesDescriptor = doc.getElementsByTagName('EntitiesDescriptor')[0];
      const entityElements = _.toArray(entitiesDescriptor.getElementsByTagName('EntityDescriptor'));

      console.log(`Total entities found: ${entityElements.length}`);
      const processLimit = limit || entityElements.length;

      return entityElements
        .filter(entityElement => entityElement.getElementsByTagName('IDPSSODescriptor').length > 0)
        .slice(0, processLimit)
        .map((entityElement) => {
          const idpEntityId = entityElement.getAttribute('entityID');

          entityElement.setAttribute('xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#');
          entityElement.setAttribute('xmlns:alg', 'urn:oasis:names:tc:SAML:metadata:algsupport');
          entityElement.setAttribute('xmlns:idpdisc', 'urn:oasis:names:tc:SAML:profiles:SSO:idp-discovery-protocol');
          entityElement.setAttribute('xmlns:init', 'urn:oasis:names:tc:SAML:profiles:SSO:request-init');
          entityElement.setAttribute('xmlns:mdrpi', 'urn:oasis:names:tc:SAML:metadata:rpi');
          entityElement.setAttribute('xmlns:mdui', 'urn:oasis:names:tc:SAML:metadata:ui');
          entityElement.setAttribute('xmlns:shibmd', 'urn:mace:shibboleth:metadata:1.0');
          entityElement.setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');

          const iDPSSODescriptorElement = entityElement.getElementsByTagName('IDPSSODescriptor')[0];
          const keyDescriptorElement = iDPSSODescriptorElement.getElementsByTagName('KeyDescriptor')[0];

          if (!keyDescriptorElement.hasAttribute('use')) {
            keyDescriptorElement.setAttribute('use', 'signing');
          }

          const singleSignOnServiceElements = _.toArray(iDPSSODescriptorElement.getElementsByTagName('SingleSignOnService'));

          let binding;
          singleSignOnServiceElements.forEach((element) => {
            const currentBinding = element.getAttribute('Binding');

            // remove unsupported binding from entity
            if (!SUPPORTED_BINDINGS.includes(currentBinding)) {
              iDPSSODescriptorElement.removeChild(element);
            } else if (!binding) {
              // set entity binding to first found supported binding
              binding = currentBinding;
            }
          });

          // sanitize metadata xml
          let xmlMetadata = xmlSerializer.serializeToString(entityElement).toString();
          xmlMetadata = xmlMetadata.replace(/\n/gm, '');
          xmlMetadata = xmlMetadata.replace(/\t/gm, '');
          xmlMetadata = xmlMetadata.replace(/\r/gm, '');
          xmlMetadata = xmlMetadata.replace(/\r\n/gm, '');
          xmlMetadata = xmlMetadata.replace(/\n*\s+\n*</gm, '<');

          // build connection name
          let connectionName = '';
          const organizationElement = entityElement.getElementsByTagName('Organization')[0];
          if (organizationElement) {
            // use organization name
            const displayNameElements = _.toArray(organizationElement.getElementsByTagName('OrganizationDisplayName'));
            const enDisplayNameElement = displayNameElements.find(element => element.getAttribute('xml:lang') === 'en');

            connectionName = enDisplayNameElement.childNodes[0].nodeValue;

            // sanitize connection name
            connectionName = connectionName.replace(/\s\s+/g, ' ');
            connectionName = connectionName.replace(/ /gm, '-');
            connectionName = connectionName.replace(/:/gm, '-');
            connectionName = connectionName.replace(/\./gm, '-');
            connectionName = connectionName.replace(/\//gm, '-');
            connectionName = connectionName.replace(/[^a-zA-Z0-9-a-zA-Z0-9]/gm, '').substring(0, 127);
            connectionName = connectionName.replace(/-+/gm, '-');
          } else {
            // use entity id
            try {
              // URL
              const entityIdUrl = new URL(idpEntityId);
              connectionName = entityIdUrl.hostname.replace(/\./gm, '-');
              const pathName = entityIdUrl.pathname.slice(1);
              if (pathName.length > 0) {
                connectionName += `-${pathName.replace(/\//gm, '-')}`;
              }
            } catch (err) {
              // URN
              connectionName = idpEntityId.split(':')
                .slice(1)
                .map(part => part.replace(/\//gm, '-'))
                .join('-');
            }
          }

          return {
            connectionName,
            idpEntityId,
            xmlMetadata,
            binding
          };
        });
    })
    .then((entities) => {
      console.log(`Processing the first: ${entities.length} entities`);
      console.log(entities.map(e => `  ${e.idpEntityId}`).join('\n'));
      let count = 0;

      return Promise.all(entities.map(entity =>
        rateLimit.limiter.schedule(() =>
          request.post({
            url: `https://${process.env.AUTH0_DOMAIN}/api/v2/connections`,
            auth: { bearer: process.env.ACCESS_TOKEN },
            json: {
              name: entity.connectionName,
              strategy: 'samlp',
              options: {
                metadataXml: entity.xmlMetadata,
                entityId: spEntityId,
                protocolBinding: entity.binding
              },
              enabled_clients: enabledClients
            }
          })
            .then((connection) => {
              console.log(`Created: ${connection.id} (${entity.connectionName})`);
              count += 1;
            })
            .catch((err) => {
              console.log(`Error: ${entity.idpEntityId} (${entity.connectionName})`);
              console.log(err.message || err);
            }))))
        .then(() => count);
    });
