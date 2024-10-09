import 'reflect-metadata';

import { Command } from 'commander';
import { Container } from 'typedi';
import { StartOptions, PublisherStarter } from './command/start';

const program = new Command();

program
    .name("xapi-publisher")
    .description("XAPI Publisher")
    .version("0.0.1");

program
    .command("start")
    .description("start XAPI Publisher")
    .action(async (options) => {
        const c = Container.get(PublisherStarter);
        await c.start({} as StartOptions);
    });

program.parse(process.argv);