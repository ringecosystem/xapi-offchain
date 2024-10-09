import { Service } from "typedi";
import { setTimeout } from "timers/promises";
import { GraphqlService } from "../services/graphql";

import {logger} from "@ringdao/xapi-common"

export interface StartOptions {
  targetChains: string[]
}

@Service()
export class XAPIExporterStarter {
  constructor(private graphqlService: GraphqlService) {}

  async start(options: StartOptions) {
    while (true) {
      try {
        await this.run(options);
        await setTimeout(1000);
      } catch (e: any) {
        console.error(e);
      }
    }
  }

  private async run(options: StartOptions) {
    // const rms = await this.graphqlService.queryRequestMade();
    logger.debug(new Date().toString(), {target: 'reporter', breads: ['hello', 'x']});
    logger.debug(new Date().toString(), {target: 'reporter', breads: ['hello', 'yyyy']});
  }
}
