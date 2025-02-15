require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());

const WEBHOOK_SITE_URL =
  "https://webhook.site/b263da62-dcf3-45b1-84e5-b94abbb30402";

async function sendToWebhookSite(data) {
  try {
    await fetch(WEBHOOK_SITE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error("Failed to send data to webhook site:", error);
  }
}

app.get("/", (req, res) => {
  res
    .status(200)
    .send(
      `Zoom Webhook sample successfully running. Set this URL with the /webhook path as your app's Event notification endpoint URL. https://github.com/zoom/webhook-sample`
    );
});

app.post("/webhook", async (req, res) => {
  let response;

  console.log(req.headers);
  console.log(req.body);

  const message = `v0:${req.headers["x-zm-request-timestamp"]}:${JSON.stringify(
    req.body
  )}`;

  const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
  if (!secretToken) {
    console.error("ZOOM_WEBHOOK_SECRET_TOKEN is missing.");
    return res.status(500).json({ message: "Server configuration error." });
  }

  const hashForVerify = crypto
    .createHmac("sha256", secretToken)
    .update(message)
    .digest("hex");
  const signature = `v0=${hashForVerify}`;

  if (req.headers["x-zm-signature"] === signature) {
    if (req.body.event === "endpoint.url_validation") {
      const hashForValidate = crypto
        .createHmac("sha256", secretToken)
        .update(req.body.payload.plainToken)
        .digest("hex");

      response = {
        message: {
          plainToken: req.body.payload.plainToken,
          encryptedToken: hashForValidate,
        },
        status: 200,
      };
    } else {
      response = {
        message: "Authorized request to Zoom Webhook sample.",
        status: 200,
      };
    }
  } else {
    response = {
      message: "Unauthorized request to Zoom Webhook sample.",
      status: 401,
    };
  }

  console.log(response);
  await sendToWebhookSite(response);

  res.status(response.status).json(response);
});

app.listen(port, () =>
  console.log(`Zoom Webhook sample listening on port ${port}!`)
);
