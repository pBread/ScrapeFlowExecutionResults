import dotenv from "dotenv";
import fs from "fs";
import _ from "lodash";
import { pRateLimit } from "p-ratelimit";
import path from "path";
import { table } from "table";
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

(async () => {
  const data = {};

  const flows = await getFlows();
  const numberOfFlows = flows.length;

  function log() {
    console.clear();
    console.log(
      table([
        ["Flows Completed", "Number of Flows", "Completion Percent"],
        [
          flowsCompleted,
          numberOfFlows,
          ((flowsCompleted / numberOfFlows) * 100).toFixed(2) + "%",
        ],
      ])
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

  const csvArray = toCsvArray(Object.values(data));

  // save results file
  try {
    fs.mkdirSync("output");
  } catch (error) {}

  fs.writeFileSync(
    path.join("output", new Date().toISOString() + ".csv"),
    csvArray.map((row) => row.join(",")).join("\n")
  );

  // print results
  console.log(table(csvArray));
})();

async function aggregateFlowResults(flowSid: string, flowName: string) {
  const counter = {};

  const executionSids = await getFlowExecutionSids(flowSid);

  for (const executionSid of executionSids) {
    try {
      const result = await getExecutionResult(flowSid, executionSid);

      const resultKey = result ? `Pressed ${result}` : "Pressed Nothing";

      if (_.has(counter, resultKey)) counter[resultKey]++;
      else counter[resultKey] = 1;
    } catch (error) {}
  }

  return Object.assign(counter, {
    total: _.sum(Object.values(counter)),
    "Flow Name": flowName,
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

function toCsvArray(docs: { [key: string]: any }[]) {
  const keySet = new Set();
  for (const doc of docs) for (const key of Object.keys(doc)) keySet.add(key);

  const keys = [...keySet].sort();

  let rows = [keys];

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    let row = [];

    for (let j = 0; j < keys.length; j++) row[j] = "";

    for (const key in doc) {
      row[keys.indexOf(key)] = doc[key];
    }

    rows[i + 1] = row;
  }

  return rows;
}
