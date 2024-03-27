import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
  const { url } = req.query;

  let urlString: string | undefined;

  if (typeof url === "string") {
    urlString = url;
  } else if (Array.isArray(url)) {
    urlString = url[0]; // Choose the appropriate array element based on your requirements
  }

  if (urlString) {
    "url", urlString; // Ensure that the query value is logged
    const response = await axios.get(urlString, {
      responseType: "arraybuffer",
    });
    res.writeHead(200, {
      "Content-Type": response.headers["content-type"],
      "Content-Length": response.headers["content-length"],
    });
    res.end(response.data);
  } else {
    // res.status(400).send("Invalid URL");
  }
};

export const config = {
  api: {
    responseLimit: false,
    // responseLimit: '8mb',
  },
};
export default handleRequest;
