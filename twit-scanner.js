require('dotenv').config();

const Twit  = require('twit');
const fs    = require('fs');

const T = new Twit({
  consumer_key:         process.env.CONSUMER_KEY,
  consumer_secret:      process.env.CONSUMER_SECRET,
  access_token:         process.env.ACCESS_TOKEN,
  access_token_secret:  process.env.ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL:            true,     // optional - requires SSL certificates to be valid.
});

class TwitScanner {
  constructor(minimalDate) {
    this.minimalDate          = minimalDate;
    this.specialKeyWord       = ['bpp', 'bppn', 'bpn', 'balikpapan', 'blkppn', 'balik papan', 'bpp,'];

    this._consumer_key        = process.env.CONSUMER_KEY;
    this._consumer_secret     = process.env.CONSUMER_SECRET;
    this._access_token        = process.env.ACCESS_TOKEN;
    this._access_token_secret = process.env.ACCESS_TOKEN_SECRET;
  }

  async scanTweet() {
    let continueRequest = true;
    let count = 1;
  
    const result = {
      data: [],
      max_id: null,
      last_created_at: null
    };
  
    while (continueRequest) {
      const tweets = await this.getTweets(result.max_id);
      tweets.shift();

      const filteredTweets  = this.filterTweets(tweets);
      const lastTweet       = tweets[tweets.length - 1];
      const maxId           = lastTweet && lastTweet.id;
      const lastCreatedAt   = lastTweet && lastTweet.created_at;

      result.data = result.data.concat(filteredTweets);
  
      continueRequest = new Date(lastCreatedAt) > this.minimalDate;

      if (maxId) {
        result.max_id = maxId;
        result.last_created_at = lastCreatedAt;
      } else {
        console.log('process done!');
        // End infinity loop
        continueRequest = false;
        break;
      }

      console.log(`request ${count}, max_id: ${maxId}`);

      fs.writeFileSync('result.json', JSON.stringify(result, null, 1));

      count++;
    }
  }

  getTweets(maxId) {
    return new Promise(async (resolve, _) => {
      const params = { count: 200, screen_name: 'FWBESS', tweet_mode: 'extended' };
  
      if (maxId) {
        params.max_id = maxId;
      }

      const response      = await T.get('statuses/user_timeline', params);
      const jsonResponse  = await response.data;

      resolve(jsonResponse);
    })
  }

  filterTweets(data) {
    const regex   = new RegExp(this.specialKeyWord.join('|'), 'i');
    const result  = [];
  
    for (let index = 0; index < data.length; index++) {
      const dataObject      = data[index];
      const textDataObject  = dataObject.full_text;
      const isAvailable     = regex.test(textDataObject);
  
      if (isAvailable) {
        result.push({
          id: dataObject.id,
          id_str: dataObject.id_str,
          full_text: textDataObject,
          created_at: dataObject.created_at
        });
      }
    }
  
    return result;
  }
}

const minimalDate = new Date('2021-02-01');

service = new TwitScanner(minimalDate);
service = service.scanTweet();
