import { run } from "@drizzle-team/brocli";
import index from "./commands/index";
import vectorize from "./commands/vectorize";
import reduce from "./commands/reduce";

run([index, vectorize, reduce]);
