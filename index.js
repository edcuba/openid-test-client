const { Issuer } = require('openid-client');
const express = require("express");

const port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080;
const address = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0";
const callback = process.env.CALLBACK_URL || `localhost:${port}`;
const provider = process.env.PROVIDER || "http://localhost:8000";
const client_id = process.env.CLIENT_ID || "clientID";
const client_secret = process.env.CLIENT_SECRET || "clientSecret";

function discovery(issuer) {

  const metadata = {
    redirect_uris: [callback],
    client_id,
    client_secret,
  };

  issuer.Client.register(metadata).then((client) => clientService(issuer, client));
}

function clientService(issuer, client) {

  function renderHome(req, res) {

    client.authorizationCallback(callback, req.query).then(function (tokenSet) {

      if (Object.keys(tokenSet).length === 0) { throw undefined; }

      const tokenJson = JSON.stringify(tokenSet, null, 2);
      const claimsJson = JSON.stringify(tokenSet.claims, null, 2);
      client.userinfo(tokenSet.access_token).then(userdata =>
        res.render("index", {
          logged: true,
          state: tokenJson,
          claims: claimsJson,
          userdata: JSON.stringify(userdata, null, 2)}
        )
      );
    }).catch(
      () => { res.render("index", { logged: undefined, claims: undefined}); }
    );
  }

  function loginService(req, res) {
    const auth = client.authorizationUrl({
      redirect_uri: callback,
      scope: 'openid profile email',
    });
    res.redirect(auth);
  }

  const app = express()
  app.use(express.static(__dirname + "/views"));
  app.set('view engine', 'ejs');

  app.get("/", renderHome);
  app.get("/login", loginService);
  app.get("/client", (req, res) => res.render("client", {client: JSON.stringify(client.metadata, null, 2)}));
  app.get("/issuer", (req, res) => res.render("issuer", {issuer: JSON.stringify(issuer.metadata, null, 2)}));

  app.listen(Number(port), address);
}

Issuer.discover(provider).then(discovery);
