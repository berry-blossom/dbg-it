import { CommandRegistry } from ".";
import { KindCommandContext } from "../../built-ins/kind/context";
import { AnyCommand } from "../../command";
import { CommandSyntaxError, RegistryWarnings } from "../../messages";
import { ReadOnlyTokenStream, TokenStream } from "../../token";

export interface parseCommandArgumentsReturn<LL extends string[] = string[]> {
	err: string | undefined;
	args: defined[];
	command: AnyCommand<LL>;
}

export function parseCommandArguments<LL extends string[] = string[]>(
	registry: CommandRegistry<unknown, LL>,
	executor: Player | undefined,
	currentCommand: AnyCommand<LL>,
	tokenized: ReadOnlyTokenStream,
	commandString: string,
): parseCommandArgumentsReturn<LL> {
	const returnA: parseCommandArgumentsReturn<LL> = {
		err: undefined,
		args: [],
		command: currentCommand,
	};
	let foundCommand: AnyCommand<LL> | undefined = undefined;
	let foundArgument: unknown = undefined;
	let didWarnArgPriority = false;

	// Command string too long!
	// This should not be a required check, at some point it is best to
	// remove this, especially now that token overflowing is implemented.
	if (!returnA.command.children.head)
		return {
			...returnA,
			err: CommandSyntaxError.TOOLONG,
		};

	const kindCtx: KindCommandContext<LL> = {
		logger: registry.logs,
		warnLevel: registry.warnL,
		executor: executor,
	};

	returnA.command.children.array().forEach((subCommand) => {
		let tokenString = tokenized.get();
		// Overflow the token if it is the last valid one for an argument.
		// To explain why this is done consider the following:
		// A user wants to execute a command that has a string argument as it's last argument.
		// For example: echo [string]
		// This allows for the user to omit quotation marks to execute the command:
		// echo hello world!
		// ==
		// echo "hello world!"
		if (
			subCommand.cmd.children.array().size() <= 0 &&
			// If the parent's subcommands have any further children, do not overflow the current argument
			subCommand.parent.children
				.array()
				.reduce((accum, current) => math.max(current.cmd.children.array().size(), accum), 0) <= 0
		) {
			// This is simply the entire command string except what comes before the cursor.
			tokenString = tokenized.getAfter();
		}

		// We have two seperate checks: one for turning the current token into the expected datatype,
		// and one for typechecking the data returned from the previous check.
		// The reason this is done is for a few reasons:
		//  1. Implementation is much easier, and it becomes clear when maintaining Kinds which code handles
		//      transforming the argument and which code handles ensuring data is valid.
		//  2. Allows us to sneak in an internal typecheck where `argument` is validated and thus we can typecheck here safely.
		//  3. Interfacing with Kinds is much nicer. If a user needs to verify some arbitrary data they are manually executing on a command
		//      it is easier to implement. For example, when the user is creating a command bar, they can easily check if an argument is
		//      valid and make the command bar's text red if it is not valid.
		const argument = subCommand.cmd.argument.transform(tokenString, kindCtx);
		const isValid = subCommand.cmd.argument.verify(argument, kindCtx);
		// if (isValid && argument) will compile to check for truthiness :/ we dont want that
		// isValid may be false OR undefined, and argument could be a falsy value!
		if (isValid !== false && isValid !== undefined && argument !== undefined) {
			// Warn the user about argument priority.
			// This may be intended behavior from the end user, so I do not want to throw an error here.
			// This is a bad practice however, so we should warn the user to not do this.
			if ((foundCommand !== undefined || foundArgument !== undefined) && !didWarnArgPriority) {
				registry.logs.append(registry.warnL, RegistryWarnings.ARGPRIORITY.format(commandString, tokenString));
				didWarnArgPriority = true;
			}
			foundCommand = subCommand.cmd;
			foundArgument = argument;
		}
	});

	if (foundCommand === undefined || foundArgument === undefined)
		return {
			...returnA,
			err: CommandSyntaxError.BADARG.format(tokenized.get(), returnA.command.getExpectedArguments()),
		};

	returnA.command = foundCommand;
	returnA.args.push(foundArgument!);

	return {
		...returnA,
		err: returnA.command.children.array().size() <= 0 ? "" : undefined,
	};
}
