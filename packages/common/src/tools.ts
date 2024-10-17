import chalk = require("chalk");

export class Tools {
  public static  shortLog(options: { input: string; len?: number }): string {
    const { input, len } = options;
    let output = input;
    const maxLength = len ?? input.length;

    const envXapiLogFull: any = process.env.XAPI_LOG_FULL;
    if (
      envXapiLogFull !== 1 ||
      envXapiLogFull !== "1" ||
      envXapiLogFull !== "true"
    ) {
      output =
        input.substring(0, input.length > maxLength ? maxLength : input.length) +
        chalk.gray("... (set XAPI_LOG_FULL=1 to show)");
    }
    return output;
  }
}

