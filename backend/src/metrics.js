// const client = require("prom-client");
import client from "prom-client";

client.collectDefaultMetrics();

export {client}