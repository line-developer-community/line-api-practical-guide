const df = require("durable-functions");

module.exports = df.orchestrator(function* (context) {
    return yield context.df.waitForExternalEvent("LineVentriloquismInput");
});