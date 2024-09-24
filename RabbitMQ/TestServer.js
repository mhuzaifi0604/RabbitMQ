import axios from 'axios';


const insertionHandler = () =>{
    const data = {
        "username": "huzaifa",
        "msisdn": "3180841063",
        "cnic": "8210122141271",
        "transactionId": "0987654320",
        "param1": null,
        "param2": null,
        "param3": null,
        "param4": null
      }
    try {
        const response = axios.post('http://localhost:3001/testrabbit',data,{
            headers: {
                "Content-Type":'application/json'
            }
        })
        console.log("Response: ", response.data)
    } catch (error) {
        console.log("Something Went Wrong!!", error)
    }
}

const uniqueRequestHanlder = async() =>{
    const data = {
        "username": "huzaifa",
        "msisdn": "3180841063",
        "cnic": "8210122141271",
        "transactionId": "47927165865",
        "param1": null,
        "param2": null,
        "param3": null,
        "param4": null
      }
    try {
        const response = axios.post('http://localhost:3001/addUnique',data,{
            headers: {
                "Content-Type":'application/json'
            }
        })
        console.log("Response: ", response.data.message)
    } catch (error) {
        console.log("Something Went Wrong!!", error)
    }
}

for (let i = 0; i < 10; i++){
    insertionHandler();
    // uniqueRequestHanlder();
}
