import axios from "axios";
import { logger } from "./winston";
import { Tools } from "./tools";

export interface BasicGraphqlParams {
  endpoint: string;
}

export interface QueryWithIds extends BasicGraphqlParams {
  ids: string[];
}

export interface GraphqlQuery extends BasicGraphqlParams {
  query: string;
  variables?: Record<string, any>;
}

export abstract class AbstractGraphqlService {
  async post(query: GraphqlQuery) {
    const options: any = {
      query: query.query,
    };
    if (query.variables) {
      options.variables = query.variables;
    }
    const response = await axios.post(query.endpoint, options, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    const { errors, data } = response.data;
    if (errors) {
      throw new Error(
        `[${query.endpoint}] \n${JSON.stringify(
          options,
        )} \nresposne is: ${JSON.stringify(errors)}`,
      );
    }
    // const gralphData = data.data;

    // #### log
    const logQuery = Tools.shortLog({
      input: `> ${query.query
        .replaceAll("   ", " ")
        .trim()
        .replaceAll("\n", "\n>")}`,
      len: 50,
    });
    const logData = Tools.shortLog({
      input: JSON.stringify(data),
      len: 100,
    });
    logger.debug(`--> ${query.endpoint}\n${logQuery}\n${logData}`);
    // #### log
    return data;
  }
}
