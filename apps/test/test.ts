import { getUsers } from "@package/coder-sdk";

getUsers({auth: "gngkBlBJiO-EWfQshGvf4pmsLCUZmKEKp"}).then((res) => {
  console.log("blob")
  console.log(res.response);
  console.log(res.data?.users);
});