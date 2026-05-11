import dotenv from "dotenv";
dotenv.config();

import { ENV } from "@/config/env";
import app from "./app";

app.listen(ENV.PORT, () => {
 console.log(` Server is running on http://localhost:${ENV.PORT}`);
});
