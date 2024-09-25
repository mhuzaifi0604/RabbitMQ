import axios from 'axios'
import {v4 as uuidv4} from 'uuid'

const insertionHandler = async () => {
  const tids = ["3v3v3b32bn", "8g3bv6g35d", "3v3v3b32bn"]; // Example transaction IDs
  let i = 0;

  const requests = Array.from({ length: 3 }, () => {
    const id = uuidv4();
    const data = {
      "id": id,
      "username": "huzaifa",
      "msisdn": "3180841063",
      "cnic": "8210122141271",
      "transactionId": tids[i], // Same ID for testing duplicate handling
      "param1": null,
      "param2": null,
      "param3": null,
      "param4": null
    };
    i += 1;
    return axios.post('http://localhost:3001/testrabbit', data);
  });

  try {
    const responses = await Promise.all(requests); // Wait for all requests to complete
    responses.forEach(response => {
      console.log("Response: ", response.data);
    });
  } catch (error) {
    console.log("Something Went Wrong!!", error);
  }
}

insertionHandler();
