import linked_list from "@rbxts/berry-linked-list";
import { LiteralKind } from "../built-ins/kind";
import { CommandSerializable } from "../data";
import { Kind } from "../kind";
import { CommandContext } from "./context";
import { Permissions } from "./permissions";

export type CommandExecution<A extends defined, T extends [...defined[]] = [A]> =
	| ((ctx: CommandContext<A, T>, ...args: T) => string | undefined | void)
	| undefined;

export type AnyCommand = ReadOnlyCommand<defined, [...defined[]]>;

export interface CommandChildrenNode {
	cmd: AnyCommand;
	parent: AnyCommand;
}

export class ReadOnlyCommand<A extends defined, T extends [...defined[]] = [A]> {
	protected _executor: CommandExecution<A, T> | undefined;
	/** @hidden */ public permissionBuilder: (p: Permissions) => Permissions = (p) => p;
	/** @hidden */ public description: string | undefined;
	/** @hidden */ public readonly parent: AnyCommand | undefined;
	/** @hidden */ public readonly children: linked_list<CommandChildrenNode> = new linked_list();

	/** @hidden */ public constructor(
		/** @hidden */ public readonly name: string,
		/** @hidden */ public readonly argument: Kind<A>,
		parent: AnyCommand | undefined = undefined,
	) {
		this.parent = parent;
	}

	/** @hidden */ public getImplementation() {
		return this._executor;
	}

	/**
	 * @hidden
	 * @returns Names of the expected arguments of all direct children under this command.
	 */
	public getExpectedArguments() {
		return `(${this.children
			.array()
			.mapFiltered((n) => n.cmd.argument.label)
			.join(" | ")})`;
	}

	/**
	 * @hidden
	 * @returns An array of suggestions to satisfy the argument of this command.
	 * If the argument's suggestion array is empty, it is assumed that there are no suggestions for the command and the input is returned instead.
	 * Assume an array where the size is 1 and the first member is the input string means a valid suggestion is completed.
	 */
	public getSuggestions(input: string): string[] {
		// TODO reduce elements based on input string
		let suggestions = [...this.argument.suggestions()];
		// If a type does not have suggestions, assume it should not have any.
		const isValid = suggestions.isEmpty();
		// TODO determine validity by fuzzy find on input string and suggestions
		if (isValid && suggestions.isEmpty()) suggestions = [input];
		return suggestions;
	}

	/**
	 * TODO implement
	 * @hidden
	 * @returns
	 */
	public getChildSuggestions(input: string): string[] {
		const suggestions: string[] = [];
		return suggestions;
	}

	/**
	 * Finds the top level permissions builder for this command, searching through all parent commands until a valid one is found.
	 * @hidden
	 */
	public findTopLevelPermissionsBuilder(): ((p: Permissions) => Permissions) | undefined {
		let permB: ((p: Permissions) => Permissions) | undefined = this.permissionBuilder;
		let topLevel: AnyCommand | undefined = this.parent;
		while (topLevel) {
			if (topLevel === undefined) break;
			if (permB !== undefined) break;
			if (topLevel?.permissionBuilder !== undefined) permB = topLevel?.permissionBuilder;
			topLevel = topLevel?.parent;
		}
		return permB;
	}

	/**
	 * TODO implement
	 * @hidden
	 * */
	public serialize(): CommandSerializable {
		return {} as never;
	}
}

export class Command<A extends defined, T extends [...defined[]] = [A]> extends ReadOnlyCommand<A, T> {
	public constructor(name: string, argument: Kind<A>, parent: AnyCommand | undefined = undefined) {
		super(name, argument, parent);
	}

	/**
	 * Add an argument subcommand to this command.
	 *
	 * @param kind The argument that the subcommand takes
	 * @param builder The command implementation
	 * @returns This command
	 */
	appendArgument<A2 extends defined>(
		kind: Kind<A2>,
		builder: (cmd: Command<A2, [...T, A2]>) => ReadOnlyCommand<A2, [...T, A2]>,
	): Command<A, T> {
		const subCommand = builder(new Command(`${kind.label}`, kind));
		this.children.add({
			cmd: subCommand as AnyCommand,
			parent: this as AnyCommand,
		});
		return this;
	}

	/**
	 * Add a literal argument to this command.
	 * This is equivalent to using {@link appendArgument} with a {@link LiteralKind} argument.
	 *
	 * Ensure you register literal arguments after string arguments, as the string argument will conflict with literal arguments.
	 *
	 * @param name Name of the subcommand
	 * @param builder The command implementation
	 * @returns This command
	 */
	public appendLiteral<A2 extends string>(
		name: A2,
		builder: (cmd: Command<A2, [...T, A2]>) => ReadOnlyCommand<A2, [...T, A2]>,
	): Command<A, T> {
		this.appendArgument(new LiteralKind(name), builder);
		return this;
	}

	/**
	 * Specify the permissions for this command. Permissions are evaluated from the first ancestor of this command, then the children.
	 *
	 * @param builder Permissions builder
	 * @returns This command
	 */
	public permissions(builder: (p: Permissions) => Permissions) {
		this.permissionBuilder = builder;
		return this;
	}

	/**
	 * Implements this command's execution function, which is run when the command is executed.
	 *
	 * @param exec The function ran on execution, which contains the arguments of all parent commands
	 * @returns This command
	 */
	public implement(exec: CommandExecution<A, T>) {
		this._executor = exec;
		return this;
	}

	public deimplement() {
		delete this._executor;
		return this;
	}

	// TODO implement
	public static deserialize(serialized: CommandSerializable) {
		// return new Command();
	}
}
