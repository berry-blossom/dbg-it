import { Command } from "../command/command";

export function helpCommand<T extends Command<"help", ["help"]>>(): (cmd: T) => T {
	return (cmd) => cmd;
}
