import { Players } from "@rbxts/services";
import { DbgItConfig, Main } from "../../shared/dbg-it";
import { CommandsSpecifier } from "../../shared/dbg-it/main";
import { SharedReplicator, SharedReplicatorLogLevels } from "../../shared/repl/replicator";
import { AnyCommand, serializeCommand } from "../../shared/command";

// Commands to batch send to client
const BATCH_SIZE = 3;

export class ServerReplicator<T extends Partial<DbgItConfig>> extends SharedReplicator {
	public readonly sendCmds: Set<Player> = new Set();
	public readonly runningCmd: Set<Player> = new Set();
	public constructor(public readonly parent: Main<T>) {
		// We can fully expect all remotes here to be present, as such I'm just going to assume
		// they are and skip any annoying checks for ensuring they are present.
		super();
		// Could totally have some attribute based system for checking if the server is initiated, but instead
		// we can initiate remote replication stuff here in the constructor instead.
		// That way, the client can init as soon as its ready.
		// We send commands later instead, so oh well.
		this.remotes.remotes().c2sExecuteCommand.instance!.OnServerEvent.Connect(async (plr, ...args: unknown[]) => {
			// Basic mutex to ensure a command doesn't go running for too long.
			// TODO - !! FINISH THIS BEFORE PROD !!
			// #! At some point, we should keep track of running mutexes and deny execution if there are too many !#
			// Failure to do this could allow a bad actor to spam the server with commands and create tons of
			// running threads, causing lots of lag.
			while (this.runningCmd.has(plr)) task.wait();
			if (!plr.IsDescendantOf(Players)) return;
			this.runningCmd.add(plr);
			const [execString] = args;
			if (!typeIs(execString, "string")) return;
			await this.parent
				.execute(execString, plr)
				.timeout(60, "Command timed out")
				.andThen((res) => {
					// Player may leave between when this is called and now, ensure they aren't still in the game.
					if (!plr.IsDescendantOf(Players)) return;
					this.remotes.remotes().s2cSendCommandResult.instance!.FireClient(plr, false, res);
				})
				.catch((err) => {
					if (!plr.IsDescendantOf(Players)) return;
					this.remotes.remotes().s2cSendCommandResult.instance!.FireClient(plr, true, tostring(err));
				});
			if (!plr.IsDescendantOf(Players)) return;
			this.runningCmd.delete(plr);
		});

		Players.PlayerRemoving.Connect((plrR) => {
			// This prevents a memory leak! :)
			function removeStalePlayers(set: Set<Player>) {
				return (plr: Player) => {
					if (!plr.IsDescendantOf(Players)) set.delete(plr);
				};
			}
			if (this.sendCmds.has(plrR)) this.sendCmds.delete(plrR);
			if (this.runningCmd.has(plrR)) this.runningCmd.delete(plrR);
			this.sendCmds.forEach(removeStalePlayers(this.sendCmds));
			this.runningCmd.forEach(removeStalePlayers(this.runningCmd));
		});
	}

	/** @hidden */
	public specify(spec: CommandsSpecifier<SharedReplicatorLogLevels>) {
		this.specifiers.add(spec);
	}

	public sendCustomReplication(plr: Player | "all", cmd: string) {
		if (typeIs(plr, "Instance")) this.remotes.remotes().s2cSendReplCommand.instance!.FireClient(plr, cmd);
		else this.remotes.remotes().s2cSendReplCommand.instance!.FireAllClients(cmd);
	}

	public init(): void {
		super.init();
		this.remotes.remotes().c2sHandshake.instance!.OnServerEvent.Connect((p) => {
			// dont ask; fixes random bug
			const plr = Players.FindFirstChild(p.Name)! as Player;
			if (plr === undefined) return;
			// TODO does not support replicating newly registered comands. this should probably be implemented behavior.
			if (this.sendCmds.has(plr)) return;
			this.sendCmds.add(plr);
			let current = 0;
			const cmds = this.parent.getRegistry().commands;
			const cmdsArr: AnyCommand[] = [];
			cmds.forEach((cmd) => cmdsArr.push(cmd as never));
			const sendNextCommand = () => {
				const nextCmd = cmdsArr[current];
				if (current === undefined) {
					// skip this, should break out of the loop eventually
					current++;
					return;
				}
				current++;
				return serializeCommand(nextCmd.asSerializable());
			};
			while (this.sendCmds.has(plr)) {
				if (current >= cmdsArr.size()) break;
				const serCmds: buffer[] = [];
				// Send batch a few server commands over
				for (const _ of $range(1, BATCH_SIZE)) {
					if (current >= cmdsArr.size()) break;
					const serial = sendNextCommand();
					if (serial !== undefined) serCmds.push(serial);
				}
				this.remotes.remotes().s2cSendSerCommand.instance!.FireClient(plr, ...serCmds);
				task.wait(1 / 20);
			}
			cmdsArr.clear();
		});
	}
}
