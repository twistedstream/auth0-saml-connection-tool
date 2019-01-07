# Auth0 SAML Connection Tool

A CLI for managing SAML connections in Auth0

## Setup

### Prerequisites

1. [Node.js](https://nodejs.org/en/download/)

### Auth0 Setup

For a tenant to be used by the tool, you must first log into the [Auth0 Dashboard](https://manage.auth0.com) and:

1. Create a new **Machine to Machine App** that will represent this tool. Name it something like: `auth0-saml-connection-tool`
1. Authorize the app for the **Auth0 Management API** and enable the following scopes:
   * `read:connections`
   * `delete:connections`
   * `create:connections`

### Global Setup

This script is not registered as a package in `npm`, but you can install it as global command directly from this repo like this:

```sh
npm install -g https://github.com/twistedstream/auth0-saml-connection-tool
```

Alternatively if you have cloned this repo to your machine, you can install the script globally by running this command from the repo directory:

```sh
npm install -g
```

## Usage

Before you can run any real commands, you need to log in:

```sh
a0saml login
```

Follow the prompts to configure the tool with the Auth0 client created above.

Now you can do stuff, like create a SAML connection from the sample [SSO Circle](sample-metadata/ssocircle.xml) metadata file:

```sh
a0saml create ./sample-metadata/ssocircle.xml
```

Here's how you can delete all your SAML connections:

```sh
a0saml delete-all
```

Or get a count of all SAML connections:

```sh
a0saml count
```

For a compete list of commands and help:

```sh
a0saml --help
```
