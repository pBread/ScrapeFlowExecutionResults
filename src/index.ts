import dotenv from "dotenv";
import _ from "lodash";
import { pRateLimit } from "p-ratelimit";
import twilio from "twilio";

dotenv.config();

const { ACCOUNT_SID, AUTH_TOKEN } = process.env;
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

const limit = pRateLimit({
  concurrency: 10, // no more than 10 running at once
  interval: 1000, // 1000 ms == 1 second
  maxDelay: 2000, // an API call delayed > 2 sec is rejected
  rate: 30, // 30 API calls per interval
});

let flowsCompleted = 0;
let requestsInProgress = 0;

(async () => {
  const data = {};

  const flows = await getFlows();
  const numberOfFlows = flows.length;

  function log() {
    console.clear();
    console.log(
      Object.entries({
        numberOfFlows,
        flowsCompleted,
        requestsInProgress,
        completionPercent:
          ((flowsCompleted / numberOfFlows) * 100).toFixed(2) + "%",
      }).reduce(
        (acc, [key, value]) =>
          Object.assign(acc, { [_.startCase(key)]: value }),
        {}
      )
    );
  }

  log();

  await Promise.allSettled(
    flows.map(async (flow) => {
      const results = await limit(() =>
        aggregateFlowResults(flow.sid, flow.friendlyName)
      );

      data[flow.friendlyName] = results;
      flowsCompleted++;
      log();
    })
  );

  console.log(data);
})();

async function aggregateFlowResults(flowSid: string, flowName: string) {
  const counter = {};

  const executionSids = await getFlowExecutionSids(flowSid);

  for (const executionSid of executionSids) {
    try {
      const result = await getExecutionResult(flowSid, executionSid);

      if (_.has(counter, result)) counter[result]++;
      else counter[result] = 1;
    } catch (error) {}
  }

  return Object.assign(counter, {
    _total: _.sum(Object.values(counter)),
    flowName,
  });
}

async function getExecutionResult(flowSid: string, executionSid: string) {
  const widgets = await getFlowExecutionWidgets(flowSid, executionSid);

  const gatherWidget: { Digits?: string } = Object.values(widgets).find(
    (widget) => _.has(widget, "Digits") // widgets that has "Digits" property is a Gather widget. This code assumes there is only one Gather widget in the flow.
  );

  return gatherWidget?.Digits || null;
}

async function getFlows() {
  return limit(async () => await client.studio.flows.list());
}

async function getFlowExecutionSids(flowSid: string) {
  return limit(
    () =>
      client.studio
        .flows(flowSid)
        .executions.list() // fetch all execution of this Studio Flow
        .then((executions) => executions.map(({ sid }) => sid)) // we only need the sid of the execution
  );
}

async function getFlowExecutionWidgets(flowSid: string, executionSid: string) {
  return limit(() =>
    client.studio
      .flows(flowSid)
      .executions(executionSid)
      .executionContext(executionSid)
      .fetch()
      .then(({ context }) => context.widgets)
  );
}
