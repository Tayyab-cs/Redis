const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const redis = require('redis');
const cacheData = require('./middleware/cacheData.js');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

let redisClient;

// anonymous self-invoked function end with ()...
// self-invoked functions instantly invoked when declared...
(async () => {
  redisClient = redis.createClient();

  redisClient.on('error', (error) => console.error(`Error : ${error}`));

  await redisClient.connect();
})();

// fetching data...
const fetchApiData = async (species) => {
  const apiResponse = await axios.get(
    `https://www.fishwatch.gov/api/species/${species}`,
  );
  console.log('Request sent to the API');
  return apiResponse.data;
};

// Api to get data and store it to redis cache...
const getSpeciesData = async (req, res) => {
  const species = req.params.species;
  let results;

  try {
    results = await fetchApiData(species);
    if (results.length === 0) {
      throw 'API returned an empty array';
    }
    await redisClient.set(species, JSON.stringify(results), {
      EX: 180,
      NX: true,
    }); // set() used to save data in redis cache...
    res.send({
      fromCache: false,
      data: results,
    });
  } catch (error) {
    console.error(error);
    res.status(404).send('Data unavailable');
  }
};

app.get('/fish/:species', cacheData, getSpeciesData);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
