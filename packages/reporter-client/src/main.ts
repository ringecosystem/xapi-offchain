import "reflect-metadata";

import { Command } from "commander";
import { Container } from "typedi";
import { StartOptions, XAPIExporterStarter } from "./command/start";

const program = new Command();

program.name("xapi-reporter").description("xapi reporter").version("0.0.1");

program
  .command("start")
  .description("start reporter program")
  .action(async (options) => {
    const c = Container.get(XAPIExporterStarter);
    await c.start({} as StartOptions);
  });

program.parse(process.argv);
