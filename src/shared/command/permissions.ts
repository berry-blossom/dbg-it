import { ExecutionError } from "../messages";
import { AnyCommand } from "./command";
import { CommandExecutor } from "./executor";

export class Permissions {
	/** @hidden */ public _level: number = 0;
	/** @hidden */ public _msg: string = ExecutionError.BADPERM;

	public constructor(
		protected readonly command: AnyCommand,
		protected readonly executor: CommandExecutor,
	) {}

	/**
	 * Sets the execution level required to use this command.
	 * Any user with an execution level greater than or equal to this level will be able to execute this command.
	 * Otherwise, command execution fails and an error message is returned.
	 * @param lvl The execution level required to use this command.
	 * @returns This builder.
	 */
	public level(lvl: number) {
		this._level = lvl;
		return this;
	}

	/**
	 * Error message for invalid permissions.
	 * By default this is the following:
	 * "You do not have permission to execute that command."
	 * @param msg The error message to display to the user for invalid permission.
	 * @returns This builder.
	 */
	public msg(msg: string) {
		this._msg = msg;
		return this;
	}

	/** @hidden */ public canExecute() {
		if (this.executor.isPlayer())
			return this.executor.registry.getExecutionLevelFor(this.executor.player!) >= this._level;
		return this.executor.registry.topLevel >= this._level;
	}

	// TODO
	public serialize() {}
	// TODO
	public static deseralize() {}
}
