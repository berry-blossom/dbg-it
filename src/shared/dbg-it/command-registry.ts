import { HttpService, RunService } from "@rbxts/services";
import { LiteralKind } from "../built-ins/kind";
import { AnyCommand, Command } from "../command/command";
import { CommandContext } from "../command/context";
import { CommandExecutor } from "../command/executor";
import { Permissions } from "../command/permissions";
import { CommandSyntaxError, ExecutionError, RegistryWarnings } from "../messages";
import { TokenStream } from "../token";

export class CommandRegistry {
	protected readonly commands: Map<string, AnyCommand> = new Map();
	/** @hidden */ public readonly level: Map<number, number> = new Map(); // Map of UserIDs. That is why this isnt an array.
	protected constructor(
		/** @hidden */ public readonly id: string, // Unique identifier for each registry, used for logging.
		/** @hidden */ public readonly topLevel: number, // Level at which the game executes commands.
		/** @hidden */ public readonly doesWarn: boolean = RunService.IsStudio(), // Shows warnings in the console for depricated or strange behavior.
	) {}

	public setExecutionLevel(player: Player, level: number) {
		this.level.set(player.UserId, level);
		return this;
	}

	public getExecutionLevel(player: Player) {
		return this.level.get(player.UserId) ?? 0;
	}

	public register<N extends string, C extends Command<N, [N]> = Command<N, [N]>>(name: N, builder: (cmd: C) => C) {
		if (this.commands.has(name) && this.doesWarn) warn(RegistryWarnings.OVERWRITTEN.format(name));
		this.commands.set(name, builder(new Command(name, new LiteralKind(name)) as C) as AnyCommand);
		return this;
	}

	public execute(commandString: string, executor: Player | undefined) {
		const tokenized = TokenStream.create(commandString);
		const command = tokenized.getPosition(0) ?? "";
		if (!this.commands.has(command)) error(ExecutionError.NOCMD.format(command), 0);

		const rootCommand = this.commands.get(command)!;
		const argumentsToCommand: defined[] = [command];
		let currentCommand: AnyCommand = rootCommand;

		const processNextCommand = (): string | undefined => {
			let foundCommand: AnyCommand | undefined = undefined;
			let foundArgument: unknown = undefined;
			let didWarnArgPriority = false;
			// Check if there are any commands left to process

			// Command string too long!
			if (!currentCommand.children.head) return CommandSyntaxError.TOOLONG;

			for (const subCommand of currentCommand.children.array()) {
				const argument = subCommand.cmd.argument.transform(tokenized.get());
				const isValid = subCommand.cmd.argument.verify(argument);
				// if (isValid && argument) will compile to check for truthiness :/ we dont want that
				// isValid may be false OR undefined, and argument could be a falsy value!
				if (isValid !== false && isValid !== undefined && argument !== undefined) {
					// Warn the user about argument priority.
					// This may be intended behavior from the end user, so I do not want to throw an error here.
					// This is a bad practice however, so we should warn the user to not do this.
					if (
						(foundCommand !== undefined || foundArgument !== undefined) &&
						this.doesWarn &&
						!didWarnArgPriority
					) {
						warn(RegistryWarnings.ARGPRIORITY.format(commandString, tokenized.get()));
						didWarnArgPriority = true;
					}
					foundCommand = subCommand.cmd;
					foundArgument = argument;
				}
			}

			// Invalid argument!
			if (foundCommand === undefined || foundArgument === undefined)
				return CommandSyntaxError.BADARG.format(tokenized.get(), currentCommand.getExpectedArguments());

			currentCommand = foundCommand;
			argumentsToCommand.push(foundArgument!);

			return undefined;
		};

		// Scale down the command tree with our parsed tokens.
		while (tokenized.inRange()) {
			tokenized.next();
			if (!tokenized.inRange()) break;
			const syntaxError = processNextCommand();
			if (syntaxError === undefined) continue;
			error(syntaxError, 0);
		}

		if (currentCommand.getImplementation() === undefined) error(ExecutionError.UNIMPL.format(commandString), 0);

		const ctx = new CommandContext(
			currentCommand as never,
			currentCommand.name,
			commandString,
			new CommandExecutor(executor, currentCommand, this),
			this,
		);

		const permissionsBuiler = currentCommand.findTopLevelPermissionsBuilder();
		if (permissionsBuiler !== undefined) {
			const permissions = permissionsBuiler(new Permissions(currentCommand, ctx.executor));
			if (!permissions.canExecute()) {
				return error(permissions._msg, 0);
			}
		}

		const [done, result] = pcall(() => currentCommand.getImplementation()?.(ctx, ...argumentsToCommand));

		if (!done) error(`Command execution error: ${result}`, 0);

		return result;
	}

	public async executeAsync(commandString: string, executor: Player | undefined) {
		return this.execute(commandString, executor);
	}

	public static create(topLevel: number) {
		return new CommandRegistry(HttpService.GenerateGUID(), topLevel, undefined);
	}
}
