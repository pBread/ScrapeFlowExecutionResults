## Usage & Limitations

This repository aggregates the execution Gather results of every flow in your Twilio account. _Note, we assume each Studio Flow only has one Gather widget. If you have multiple Gather widgets in a Studio Flow, it will return the results of the first widget and the results may be inaccurate._

## Setup

### Clone Repo

```bash
git clone https://github.com/pBread/ScrapeFlowExecutionResults.git
cd ScrapeFlowExecutionResults
npm install
```

### Add Env Variables

```bash
cp env.example .env
```

Then populate your .env file with your Twilio ACCOUNT_SID & AUTH_TOKEN.

### Run

```js
npm run dev
```

Your results will be printed to your terminal and saved in the /output directory.
