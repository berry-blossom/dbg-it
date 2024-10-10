import { CommandRegistry } from "../dbg-it/command-registry";
import { AnyCommand } from "./command";

const GAME_NAME = `@!_${game.Name}_!`;

export class CommandExecutor {
	public constructor(
		public readonly player: Player | undefined,
		protected readonly command: AnyCommand,
		public readonly registry: CommandRegistry,
	) {}

	/**
	 * @returns
	 * 	The name of the player executing this command. If the executor is not a player, it isntead returns the following: `@!_game.Name_!`
	 *	where game.Name is the `Name` property of `game`.
	 */
	public name() {
		return `${this.player?.Name ?? GAME_NAME}`;
	}

	/**
	 * @returns The player executing this command, if one exists.
	 */
	public instance() {
		return this.player;
	}

	/**
	 * @returns If the executor of this command is a player or not.
	 */
	public isPlayer() {
		return this.player !== undefined;
	}

	/**
	 * @returns The execution level of the executor of this command. If the executor is not a player, it uses the top level under the registry.
	 */
	public level() {
		return this.isPlayer() ? this.registry.getExecutionLevelFor(this.player!) : this.registry.topLevel;
	}
}
