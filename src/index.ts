import dotenv from "dotenv";
import twilio from "twilio";
import _ from "lodash";

dotenv.config();

const { ACCOUNT_SID, AUTH_TOKEN } = process.env;
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

(async () => {
  const counters = {};

  const flows = await client.studio.flows
    .list()
    .then((flows) =>
      flows.filter((flow) => flow.sid === "FW8abdd988a49910442e03eca1d61d5a38")
    );

  for (const flow of flows) {
    const results = await aggregateFlowResults(flow.sid, flow.friendlyName);
    counters[flow.friendlyName] = results;
  }

  console.log(counters);
})();

async function aggregateFlowResults(flowSid: string, flowName: string) {
  const counter = {};

  const executionSids = await client.studio
    .flows(flowSid)
    .executions.list() // fetch all execution of this Studio Flow
    .then((executions) => executions.map(({ sid }) => sid)); // we only need the sid of the execution

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
  const widgets = await client.studio
    .flows(flowSid)
    .executions(executionSid)
    .executionContext(executionSid)
    .fetch()
    .then(({ context }) => context.widgets);

  const gatherWidget: { Digits?: string } = Object.values(widgets).find(
    (widget) => _.has(widget, "Digits") // widgets that has "Digits" property is a Gather widget. This code assumes there is only one Gather widget in the flow.
  );

  return gatherWidget?.Digits || null;
}
