import { CommandRegistry } from "../dbg-it/command-registry";
import { AnyCommand } from "./command";

const GAME_NAME = `@!_${game.Name}_!`;

export class CommandExecutor {
	public constructor(
		public readonly player: Player | undefined,
		protected readonly command: AnyCommand,
		public readonly registry: CommandRegistry,
	) {}

	public name() {
		return `${this.player?.Name ?? GAME_NAME}`;
	}

	public instance() {
		return this.player;
	}

	public isPlayer() {
		return this.player !== undefined;
	}

	public level() {
		return this.isPlayer() ? this.registry.getExecutionLevel(this.player!) : this.registry.topLevel;
	}
}
