import 'reflect-metadata';

import { Command } from 'commander';
import { Container } from 'typedi';
import { StartOptions, PublisherStarter } from './command/start';
import { HelixChain, HelixChainConf } from '@helixbridge/helixconf';
import { logger } from "@ringdao/xapi-common";

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
        await c.start({
            targetChains: options.chain,
            nearAccount: process.env.NEAR_ACCOUNT!,
            // @ts-ignore
            nearPrivateKey: process.env.NEAR_PRIVATE_KEY!
        });
    });

program.parse(process.argv);

process.on('uncaughtException', (error) => {
    logger.error(`detected uncaught exception: ${error.message}`, { target: 'main' });
})