import dotenv from "dotenv";
import twilio from "twilio";
import _ from "lodash";
dotenv.config();

const FLOW_SID = "FW8abdd988a49910442e03eca1d61d5a38";

const { ACCOUNT_SID, AUTH_TOKEN } = process.env;
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

const counter = {}; // counts the number of times each option was selected
const WIDGET_NAME = "MyGatherWidget"; // the name of your Studio Flow's gather widget you are analyzing

(async () => {
  const executionSids = await client.studio
    .flows(FLOW_SID)
    .executions.list() // fetch all execution of this Studio Flow
    .then((executions) => executions.map(({ sid }) => sid)); // we only need the sid of the execution

  for (const executionSid of executionSids) {
    const widgets = await client.studio
      .flows(FLOW_SID)
      .executions(executionSid)
      .executionContext(executionSid)
      .fetch() // fetch the executionContext record
      .then((executionContext) => executionContext.context.widgets); // the .context.widgets property contains all of the input results of this execution

    if (_.has(counter, widgets[WIDGET_NAME]?.Digits))
      counter[widgets[WIDGET_NAME]?.Digits]++;
    else counter[widgets[WIDGET_NAME]?.Digits] = 1;
  }

  console.log(counter);
})();
