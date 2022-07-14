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
