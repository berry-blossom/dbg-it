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

	public level(lvl: number) {
		this._level = lvl;
		return this;
	}

	/**
	 * Error message for invalid permissions.
	 * By default this is the following:
	 * "You do not have permission to execute that command."
	 */
	public msg(msg: string) {
		this._msg = msg;
		return this;
	}

	/** @hidden */ public canExecute() {
		if (this.executor.isPlayer())
			return this.executor.registry.getExecutionLevel(this.executor.player!) >= this._level;
		return this.executor.registry.topLevel >= this._level;
	}

	// TODO
	public serialize() {}
	// TODO
	public static deseralize() {}
}
