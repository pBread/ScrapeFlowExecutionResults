import dotenv from "dotenv";
import twilio from "twilio";
dotenv.config();

const { ACCOUNT_SID, AUTH_TOKEN } = process.env;
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

const FLOW_SID = "FW8abdd988a49910442e03eca1d61d5a38";

const counter = { "1": 0, "2": 0 };

(async () => {
  const executionSids = await client.studio
    .flows(FLOW_SID)
    .executions.list()
    .then((executions) => executions.map(({ sid }) => sid));

  for (const executionSid of executionSids) {
    const executionContext = await client.studio
      .flows(FLOW_SID)
      .executions(executionSid)
      .executionContext(executionSid)
      .fetch();

    counter[executionContext.context.widgets.MyGatherWidget?.Digits]++;
  }

  console.log(counter);
})();
