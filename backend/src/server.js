require('dotenv').config();

const { env } = require('./config/env');
const app = require('./app');

const PORT = env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Brightloop backend listening on port ${PORT}`);
});
