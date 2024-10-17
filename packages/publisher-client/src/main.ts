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
    .option(
        "-c, --chain <char>",
        "target chain list",
        (val: string, items: HelixChainConf[]) => {
            if (!val) return items;
            const chains: HelixChainConf[] = val
                .split(",")
                .map((item) => HelixChain.get(item))
                .filter((item) => item != undefined);
            items.push(...chains);
            return items;
        },
        [],
    )
    .action(async (options) => {
        logger.debug(`run with chains: ${options.chain.map((item: any) => item.code).join(', ')}`);
        const c = Container.get(PublisherStarter);
        await c.start({
            targetChains: options.chain
        });
    });

program.parse(process.argv);

process.on('uncaughtException', (error) => {
    logger.error(`detected uncaught exception: ${error.message}`, { target: 'main' });
})