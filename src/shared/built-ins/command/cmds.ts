import { AnyCommand, Command } from "../../command/command";
import { CommandContext } from "../../command/context";
import { CommandExecutor } from "../../command/executor";
import { Permissions } from "../../command/permissions";
import { paginate } from "../../util/pages";
import { IntegerKind } from "../kind";

export interface CmdsCommandOptions {
	commandsPerPage: number;
	determineHelpString: (
		cmd: AnyCommand,
		key: string,
		executor: CommandExecutor,
		permissionNames?: string[] | undefined,
	) => string;
	permissionNames: string[] | undefined;
}

interface GetCommandsNode {
	cmd: AnyCommand;
	key: string;
}

function getCommands<LL extends string[], T extends CommandContext<defined, defined[], LL>>(ctx: T): GetCommandsNode[] {
	const cmds: GetCommandsNode[] = [];
	ctx.registry.commands.forEach((v, k) => cmds.push({ cmd: v as never, key: k }));
	return cmds;
}

export function defaultDetermineHelpString(
	cmd: AnyCommand,
	key: string,
	executor: CommandExecutor,
	permissionNames: string[] | undefined = undefined,
): string {
	const permissionsBuilder = cmd.findTopLevelPermissionsBuilder();
	const permissions = permissionsBuilder?.(new Permissions(cmd, executor));
	const executionLevel = permissions?._level ?? 0;

	// Hide commands with no implementation
	if (cmd.getImplementation() === undefined) return "";

	// Hide commands less than our execution level
	if (executor.level() < executionLevel) return "";

	let helpString = key;
	helpString += ` (${(permissionNames !== undefined && permissionNames[executionLevel]) ?? tostring(executionLevel)})`;
	if (cmd.description !== undefined) helpString += ` -- ${cmd.description}`;
	return helpString;
}

export function cmdsCommand<LL extends string[] = string[]>(
	options: Partial<CmdsCommandOptions> = {},
): (cmd: Command<"cmds", ["cmds"], LL>) => Command<"cmds", ["cmds"], LL> {
	// Merge default and user options
	const settings = { commandsPerPage: 10, determineHelpString: defaultDetermineHelpString, ...options };

	function cmdsToHelpStrings(cmds: GetCommandsNode[], executor: CommandExecutor): string[] {
		const helpStrings: string[] = [];
		function searchCommandAndChildren(cmd: AnyCommand, key: string = cmd.name, level: string = ""): void {
			// Ensure no trailing spaces
			const myLevel = `${level === "" ? key : `${level} ${key}`}`;
			const helpString = settings.determineHelpString(cmd, myLevel, executor, settings.permissionNames);
			if (helpString !== "") helpStrings.push(helpString);
			cmd.children.forEach((node) => searchCommandAndChildren(node.cmd, node.cmd.name, myLevel));
		}
		for (const node of cmds) searchCommandAndChildren(node.cmd, node.key);
		return helpStrings;
	}

	return (cmd) =>
		cmd
			.implement((ctx) => {
				const cmds = getCommands(ctx as never);
				return paginate(cmdsToHelpStrings(cmds, ctx.executor as never), settings.commandsPerPage);
			})
			.appendArgument(new IntegerKind(), (cmd) =>
				cmd.implement((ctx, _, page) => {
					const cmds = getCommands(ctx as never);
					return paginate(cmdsToHelpStrings(cmds, ctx.executor as never), settings.commandsPerPage, page);
				}),
			);
}
