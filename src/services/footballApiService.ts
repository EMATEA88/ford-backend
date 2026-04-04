import axios from "axios";

export const getFinishedMatches = async () => {
  const today = new Date().toISOString().split("T")[0];

  const res = await axios.get(
    `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&s=Soccer`
  );

  return res.data.events || [];
};